import type { HttpContext } from '@adonisjs/core/http'
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server'
import type { AuthenticationResponseJSON, RegistrationResponseJSON } from '@simplewebauthn/types'

import { db } from '#services/db'
import { sql } from 'kysely'
import env from '#start/env'
import {
  WEBAUTHN_AUTH_CHALLENGE_KEY,
  WEBAUTHN_REG_CHALLENGE_KEY,
  isTwoFactorPassed,
  loadUserWithTwoFactor,
  markTwoFactorPassed,
  isSecurityConfirmed,
  parseTransports,
} from '#services/two_factor'

const fallbackOrigin = `http://${env.get('HOST', 'localhost')}:${env.get('PORT', 3333)}`
const rpId = env.get('WEBAUTHN_RP_ID', new URL(env.get('WEBAUTHN_ORIGIN', fallbackOrigin)).hostname)
const origin = env.get('WEBAUTHN_ORIGIN', fallbackOrigin)
const rpName = env.get('WEBAUTHN_RP_NAME', env.get('APP_ISSUER', 'Adonis'))

const fromBase64Url = (value: string) => Buffer.from(value, 'base64url')
const toBase64Url = (value: Uint8Array | Uint8Array<ArrayBuffer> | ArrayBuffer | Buffer) =>
  Buffer.from(value instanceof ArrayBuffer ? new Uint8Array(value) : value).toString('base64url')

export default class WebauthnController {
  async registerOptions({ auth, session, response }: HttpContext) {
    const user = await loadUserWithTwoFactor(auth.user!.id)

    if (!isSecurityConfirmed(session)) {
      return response.unauthorized({
        message: 'Security confirmation required to add passkeys',
      })
    }

    if (user.isTwoFactorEnabled && !isTwoFactorPassed(session)) {
      return response.unauthorized({
        message: 'Two-factor authentication required to add WebAuthn',
      })
    }

    const existing = await db()
      .selectFrom('webauthnCredentials')
      .select(['credentialId'])
      .where('webauthnCredentials.userId', '=', user.id)
      .execute()

    const options = await generateRegistrationOptions({
      rpName,
      rpID: rpId,
      userID: Buffer.from(String(user.id)),
      userName: user.email,
      userDisplayName: user.name,
      attestationType: 'none',
      excludeCredentials: existing.map((credential) => ({
        id: credential.credentialId,
        type: 'public-key' as const,
      })),
      authenticatorSelection: {
        userVerification: 'preferred',
      },
    })

    session.put(WEBAUTHN_REG_CHALLENGE_KEY, options.challenge)

    return { options }
  }

  async verifyRegistration({ auth, request, session, response }: HttpContext) {
    const user = await loadUserWithTwoFactor(auth.user!.id)

    if (!isSecurityConfirmed(session)) {
      return response.unauthorized({
        message: 'Security confirmation required to add passkeys',
      })
    }

    const attestation = request.input('attestation') as RegistrationResponseJSON | undefined
    const friendlyName = request.input('friendlyName') as string | undefined
    const expectedChallenge = session.get(WEBAUTHN_REG_CHALLENGE_KEY) as string | undefined

    if (!attestation || !expectedChallenge) {
      return response.badRequest({ message: 'Missing registration payload' })
    }

    const verification = await verifyRegistrationResponse({
      response: attestation,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpId,
      requireUserVerification: true,
    })

    if (!verification.verified || !verification.registrationInfo) {
      return response.badRequest({ message: 'WebAuthn verification failed' })
    }

    const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo
    const { counter } = credential

    const transports = (attestation.response?.transports as string[] | undefined) ?? []

    await db()
      .insertInto('webauthnCredentials')
      .values({
        userId: user.id,
        credentialId: credential.id,
        publicKey: toBase64Url(credential.publicKey),
        counter,
        transports: sql`cast(${JSON.stringify(transports)} as jsonb)`,
        deviceType: credentialDeviceType,
        backedUp: credentialBackedUp,
        friendlyName: friendlyName ?? null,
      })
      .onConflict((oc) => oc.column('credentialId').doNothing())
      .execute()

    // Passkey registration doesn't enable OTP - they're separate
    markTwoFactorPassed(session)
    session.forget(WEBAUTHN_REG_CHALLENGE_KEY)

    return response.ok({ verified: verification.verified })
  }

  async authenticationOptions({ auth, session, response }: HttpContext) {
    const user = await loadUserWithTwoFactor(auth.user!.id)
    const credentials = await db()
      .selectFrom('webauthnCredentials')
      .selectAll()
      .where('webauthnCredentials.userId', '=', user.id)
      .execute()

    if (!credentials.length) {
      return response.badRequest({ message: 'No security keys registered' })
    }

    const options = await generateAuthenticationOptions({
      rpID: rpId,
      userVerification: 'preferred',
      allowCredentials: credentials.map((credential) => ({
        id: credential.credentialId,
        type: 'public-key' as const,
        transports: parseTransports(credential.transports),
      })),
    })

    session.put(WEBAUTHN_AUTH_CHALLENGE_KEY, options.challenge)

    return { options }
  }

  async verifyAuthentication({ auth, request, session, response }: HttpContext) {
    const user = await loadUserWithTwoFactor(auth.user!.id)
    const assertion = request.input('assertion') as AuthenticationResponseJSON | undefined
    const expectedChallenge = session.get(WEBAUTHN_AUTH_CHALLENGE_KEY) as string | undefined

    if (!assertion || !expectedChallenge) {
      return response.badRequest({ message: 'Missing authentication payload' })
    }

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
        transports: parseTransports(credential.transports),
      },
      requireUserVerification: true,
    })

    if (!verification.verified || !verification.authenticationInfo) {
      return response.badRequest({ message: 'WebAuthn verification failed' })
    }

    await db()
      .updateTable('webauthnCredentials')
      .set({
        counter: verification.authenticationInfo.newCounter,
        updatedAt: new Date(),
      })
      .where('id', '=', credential.id)
      .execute()

    markTwoFactorPassed(session)
    session.forget(WEBAUTHN_AUTH_CHALLENGE_KEY)

    return response.ok({ verified: verification.verified })
  }
}
