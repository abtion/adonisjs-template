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
  async registerOptions({ auth, session, response, i18n }: HttpContext) {
    const user = await loadUserWithTwoFactor(auth.user!.id)

    if (!isSecurityConfirmed(session)) {
      return response.unauthorized({
        message: i18n.formatMessage('errors.securityConfirmationRequiredAddPasskeys'),
      })
    }

    if (user.isTwoFactorEnabled && !isTwoFactorPassed(session)) {
      return response.unauthorized({
        message: i18n.formatMessage('errors.twoFactorRequiredAddWebauthn'),
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

  async verifyRegistration({ auth, request, session, response, i18n }: HttpContext) {
    const user = await loadUserWithTwoFactor(auth.user!.id)

    if (!isSecurityConfirmed(session)) {
      return response.unauthorized({
        message: i18n.formatMessage('errors.securityConfirmationRequiredAddPasskeys'),
      })
    }

    const attestation = request.input('attestation') as RegistrationResponseJSON | undefined
    const friendlyName = request.input('friendlyName') as string | undefined
    const expectedChallenge = session.get(WEBAUTHN_REG_CHALLENGE_KEY) as string | undefined

    if (!attestation || !expectedChallenge) {
      return response.badRequest({
        message: i18n.formatMessage('errors.missingRegistrationPayload'),
      })
    }

    const verification = await webauthnServer.verifyRegistrationResponse({
      response: attestation,
      expectedChallenge,
      expectedOrigin: getOrigin(),
      expectedRPID: getRpId(),
      requireUserVerification: true,
    })

    if (!verification.verified || !verification.registrationInfo) {
      return response.badRequest({
        message: i18n.formatMessage('errors.webauthnVerificationFailed'),
      })
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

  async authenticationOptions({ auth, session, response, i18n }: HttpContext) {
    const user = await loadUserWithTwoFactor(auth.user!.id)
    const credentials = await db()
      .selectFrom('webauthnCredentials')
      .selectAll()
      .where('webauthnCredentials.userId', '=', user.id)
      .execute()

    if (!credentials.length) {
      return response.badRequest({
        message: i18n.formatMessage('errors.noSecurityKeysRegistered'),
      })
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

  async verifyAuthentication({ auth, request, session, response, i18n }: HttpContext) {
    const user = await loadUserWithTwoFactor(auth.user!.id)
    const assertion = request.input('assertion') as AuthenticationResponseJSON | undefined
    const expectedChallenge = session.get(WEBAUTHN_AUTH_CHALLENGE_KEY) as string | undefined

    if (!assertion || !expectedChallenge) {
      return response.badRequest({
        message: i18n.formatMessage('errors.missingAuthenticationPayload'),
      })
    }

    const credential = await db()
      .selectFrom('webauthnCredentials')
      .selectAll()
      .where('webauthnCredentials.userId', '=', user.id)
      .where('webauthnCredentials.credentialId', '=', assertion.id)
      .executeTakeFirst()

    if (!credential) {
      return response.badRequest({ message: i18n.formatMessage('errors.credentialNotFound') })
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
      return response.badRequest({
        message: i18n.formatMessage('errors.webauthnVerificationFailed'),
      })
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
