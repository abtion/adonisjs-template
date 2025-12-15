import type { HttpContext } from '@adonisjs/core/http'
import { webauthnServer } from '#services/webauthn_server'
import type { AuthenticationResponseJSON, RegistrationResponseJSON } from '@simplewebauthn/types'

import { db } from '#services/db'
import { sql } from 'kysely'
import {
  WEBAUTHN_AUTH_CHALLENGE_KEY,
  WEBAUTHN_REG_CHALLENGE_KEY,
  isTwoFactorPassed,
  loadUserWithTwoFactor,
  markTwoFactorPassed,
  isSecurityConfirmed,
  parseTransports,
} from '#services/two_factor'
import {
  getRpId,
  getOrigin,
  getRpName,
  fromBase64Url,
  toBase64Url,
} from '#services/webauthn_service'

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

    const options = await webauthnServer.generateRegistrationOptions({
      rpName: getRpName(),
      rpID: getRpId(),
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

    const verification = await webauthnServer.verifyRegistrationResponse({
      response: attestation,
      expectedChallenge,
      expectedOrigin: getOrigin(),
      expectedRPID: getRpId(),
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

    const options = await webauthnServer.generateAuthenticationOptions({
      rpID: getRpId(),
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
