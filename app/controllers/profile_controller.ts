import type { HttpContext } from '@adonisjs/core/http'
import {
  loadUserWithTwoFactor,
  userHasWebauthnCredentials,
  markSecurityConfirmed,
  isSecurityConfirmed,
  SECURITY_CONFIRMATION_CHALLENGE_KEY,
} from '#services/two_factor'
import twoFactorAuth from '@nulix/adonis-2fa/services/main'
import { db } from '#services/db'
import { sql } from 'kysely'
import hash from '@adonisjs/core/services/hash'
import { generateAuthenticationOptions, verifyAuthenticationResponse } from '@simplewebauthn/server'
import type { AuthenticationResponseJSON } from '@simplewebauthn/types'
import env from '#start/env'

const fallbackOrigin = `http://${env.get('HOST', 'localhost')}:${env.get('PORT', 3333)}`
const rpId = env.get('WEBAUTHN_RP_ID', new URL(env.get('WEBAUTHN_ORIGIN', fallbackOrigin)).hostname)
const origin = env.get('WEBAUTHN_ORIGIN', fallbackOrigin)

const fromBase64Url = (value: string) => Buffer.from(value, 'base64url')

const parseRecoveryCodes = (codes: unknown): string[] => {
  if (Array.isArray(codes)) return codes as string[]
  if (typeof codes === 'string') {
    try {
      return JSON.parse(codes)
    } catch {
      return []
    }
  }
  return []
}

export default class ProfileController {
  async show({ auth, inertia }: HttpContext) {
    const user = await loadUserWithTwoFactor(auth.user!.id)
    const hasWebauthn = await userHasWebauthnCredentials(user.id)
    const recoveryCodes = parseRecoveryCodes(user.twoFactorRecoveryCodes)

    const webauthnCredentials = await db()
      .selectFrom('webauthnCredentials')
      .select(['id', 'friendlyName', 'createdAt', 'updatedAt'])
      .where('userId', '=', user.id)
      .orderBy('createdAt', 'desc')
      .execute()

    return inertia.render('profile/index', {
      user: {
        name: user.name,
        email: user.email,
      },
      twoFactor: {
        enabled: user.isTwoFactorEnabled,
        hasWebauthn,
        recoveryCodesCount: recoveryCodes.length,
      },
      passkeys: webauthnCredentials.map((cred) => ({
        id: cred.id,
        friendlyName: cred.friendlyName,
        createdAt: cred.createdAt,
        lastUsed: cred.updatedAt,
      })),
    })
  }

  async confirmSecurity({ auth, request, session, response }: HttpContext) {
    const user = await loadUserWithTwoFactor(auth.user!.id)
    const password = request.input('password') as string | undefined
    const assertion = request.input('assertion') as AuthenticationResponseJSON | undefined
    const expectedChallenge = session.get(SECURITY_CONFIRMATION_CHALLENGE_KEY) as string | undefined

    // Verify password
    if (password) {
      const isPasswordValid = await hash.verify(user.password, password)
      if (!isPasswordValid) {
        return response.unauthorized({ message: 'Invalid password' })
      }
      markSecurityConfirmed(session)
      return response.ok({ confirmed: true })
    }

    // Verify passkey
    if (assertion && expectedChallenge) {
      const credential = await db()
        .selectFrom('webauthnCredentials')
        .selectAll()
        .where('webauthnCredentials.userId', '=', user.id)
        .where('webauthnCredentials.credentialId', '=', assertion.id)
        .executeTakeFirst()

      if (!credential) {
        return response.badRequest({ message: 'Credential not found' })
      }

      const verification = await verifyAuthenticationResponse({
        response: assertion,
        expectedChallenge,
        expectedOrigin: origin,
        expectedRPID: rpId,
        credential: {
          id: credential.credentialId,
          publicKey: fromBase64Url(credential.publicKey),
          counter: credential.counter,
          transports: credential.transports as any,
        },
        requireUserVerification: true,
      })

      if (!verification.verified || !verification.authenticationInfo) {
        return response.badRequest({ message: 'Passkey verification failed' })
      }

      await db()
        .updateTable('webauthnCredentials')
        .set({
          counter: verification.authenticationInfo.newCounter,
          updatedAt: new Date(),
        })
        .where('id', '=', credential.id)
        .execute()

      markSecurityConfirmed(session)
      session.forget(SECURITY_CONFIRMATION_CHALLENGE_KEY)
      return response.ok({ confirmed: true })
    }

    return response.badRequest({ message: 'Password or passkey assertion required' })
  }

  async confirmSecurityOptions({ auth, session, response }: HttpContext) {
    const user = await loadUserWithTwoFactor(auth.user!.id)
    const credentials = await db()
      .selectFrom('webauthnCredentials')
      .selectAll()
      .where('webauthnCredentials.userId', '=', user.id)
      .execute()

    const options = await generateAuthenticationOptions({
      rpID: rpId,
      userVerification: 'preferred',
      allowCredentials: credentials.map((credential) => ({
        id: credential.credentialId,
        type: 'public-key' as const,
        transports: credential.transports as any,
      })),
    })

    session.put(SECURITY_CONFIRMATION_CHALLENGE_KEY, options.challenge)

    return response.ok({ options, hasPasskeys: credentials.length > 0 })
  }

  async enable({ auth, response, session }: HttpContext) {
    const user = await loadUserWithTwoFactor(auth.user!.id)

    if (!isSecurityConfirmed(session)) {
      return response.unauthorized({
        message: 'Security confirmation required to modify 2FA settings',
      })
    }

    if (user.isTwoFactorEnabled) {
      return response.badRequest({ message: 'Two-factor authentication is already enabled' })
    }

    const secret = await twoFactorAuth.generateSecret(user.email)
    const recoveryCodes = twoFactorAuth.generateRecoveryCodes()

    await db()
      .updateTable('users')
      .set({
        twoFactorSecret: sql`cast(${JSON.stringify(secret)} as jsonb)`,
        twoFactorRecoveryCodes: sql`cast(${JSON.stringify(recoveryCodes)} as jsonb)`,
        isTwoFactorEnabled: false,
      })
      .where('users.id', '=', user.id)
      .execute()

    return response.ok({ secret, recoveryCodes })
  }

  async removePasskey({ auth, request, response, session }: HttpContext) {
    const user = await loadUserWithTwoFactor(auth.user!.id)

    if (!isSecurityConfirmed(session)) {
      return response.unauthorized({
        message: 'Security confirmation required to remove passkeys',
      })
    }

    const credentialId = request.param('id')

    if (!credentialId) {
      return response.badRequest({ message: 'Credential ID is required' })
    }

    // Verify the credential belongs to the user
    const credential = await db()
      .selectFrom('webauthnCredentials')
      .select(['id', 'userId'])
      .where('id', '=', Number(credentialId))
      .where('userId', '=', user.id)
      .executeTakeFirst()

    if (!credential) {
      return response.notFound({ message: 'Passkey not found' })
    }

    await db()
      .deleteFrom('webauthnCredentials')
      .where('id', '=', Number(credentialId))
      .where('userId', '=', user.id)
      .execute()

    return response.ok({ message: 'Passkey removed successfully' })
  }
}
