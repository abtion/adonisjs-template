import type { HttpContext } from '@adonisjs/core/http'
import {
  loadUserWithTwoFactor,
  userHasWebauthnCredentials,
  markSecurityConfirmed,
  isSecurityConfirmed,
  SECURITY_CONFIRMATION_CHALLENGE_KEY,
  parseTransports,
  parseRecoveryCodes,
} from '#services/two_factor'
import { getRpId, getOrigin, fromBase64Url } from '#services/webauthn_service'
import { confirmSecurityValidator } from '#validators/profile_validator'
import twoFactorAuth from '@nulix/adonis-2fa/services/main'
import { db } from '#services/db'
import { sql } from 'kysely'
import hash from '@adonisjs/core/services/hash'
import { webauthnServer } from '#services/webauthn_server'
import type { AuthenticationResponseJSON } from '@simplewebauthn/types'

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
    const data = await request.validateUsing(confirmSecurityValidator)
    const expectedChallengeValue = session.get(SECURITY_CONFIRMATION_CHALLENGE_KEY)
    const expectedChallenge =
      typeof expectedChallengeValue === 'string' ? expectedChallengeValue : undefined

    // Ensure at least one authentication method is provided
    if (!data.password && !data.assertion) {
      return response.badRequest({ message: 'Password or passkey assertion required' })
    }

    // Verify password
    if (data.password) {
      const isPasswordValid = await hash.verify(user.password, data.password)
      if (!isPasswordValid) {
        return response.unauthorized({ message: 'Invalid password' })
      }
      markSecurityConfirmed(session)
      return response.ok({ confirmed: true })
    }

    // Verify passkey
    if (data.assertion && expectedChallenge) {
      // Type is validated by confirmSecurityValidator
      const assertion: AuthenticationResponseJSON = data.assertion as AuthenticationResponseJSON
      const credential = await db()
        .selectFrom('webauthnCredentials')
        .selectAll()
        .where('webauthnCredentials.userId', '=', user.id)
        .where('webauthnCredentials.credentialId', '=', assertion.id)
        .executeTakeFirst()

      if (!credential) {
        return response.badRequest({ message: 'Credential not found' })
      }

      const verification = await webauthnServer.verifyAuthenticationResponse({
        response: assertion,
        expectedChallenge,
        expectedOrigin: getOrigin(),
        expectedRPID: getRpId(),
        credential: {
          id: credential.credentialId,
          publicKey: fromBase64Url(credential.publicKey),
          counter: credential.counter,
          transports: parseTransports(credential.transports),
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

    // If assertion provided but no challenge in session
    if (data.assertion && !expectedChallenge) {
      return response.badRequest({ message: 'Security confirmation challenge not found' })
    }
  }

  async confirmSecurityOptions({ auth, session, response }: HttpContext) {
    const user = await loadUserWithTwoFactor(auth.user!.id)
    const credentials = await db()
      .selectFrom('webauthnCredentials')
      .selectAll()
      .where('webauthnCredentials.userId', '=', user.id)
      .execute()

    const options = await webauthnServer.generateAuthenticationOptions({
      rpID: getRpId(),
      userVerification: 'preferred',
      allowCredentials: credentials.map((credential) => ({
        id: credential.credentialId,
        type: 'public-key' as const,
        transports: parseTransports(credential.transports),
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

    const credentialIdParam = request.param('id')
    if (!credentialIdParam) {
      return response.badRequest({ message: 'Credential ID is required' })
    }

    const credentialId = Number(credentialIdParam)
    if (Number.isNaN(credentialId) || credentialId <= 0) {
      return response.badRequest({ message: 'Invalid credential ID' })
    }

    // Verify the credential belongs to the user
    const credential = await db()
      .selectFrom('webauthnCredentials')
      .select(['id', 'userId'])
      .where('id', '=', credentialId)
      .where('userId', '=', user.id)
      .executeTakeFirst()

    if (!credential) {
      return response.notFound({ message: 'Passkey not found' })
    }

    await db()
      .deleteFrom('webauthnCredentials')
      .where('id', '=', credentialId)
      .where('userId', '=', user.id)
      .execute()

    return response.ok({ message: 'Passkey removed successfully' })
  }
}
