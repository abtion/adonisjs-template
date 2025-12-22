import type { HttpContext } from '@adonisjs/core/http'
import * as webauthnServer from '@simplewebauthn/server'
import type { RegistrationResponseJSON } from '@simplewebauthn/types'

import { db } from '#services/db'
import { getOrigin, getRpId, getRpName } from '#services/webauthn_service'
import FormError from '#exceptions/form_error'

const WEBAUTHN_REG_CHALLENGE_KEY = 'webauthnRegistrationChallenge'

export default class ProfileWebauthnController {
  async options({ auth, security, session }: HttpContext) {
    security.ensureConfirmed()

    const user = auth.user!
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

  async store({ auth, security, request, session, response, i18n }: HttpContext) {
    security.ensureConfirmed()

    const attestation = request.input('attestation') as RegistrationResponseJSON | undefined
    const friendlyName = request.input('friendlyName') as string | undefined
    const expectedChallenge = session.get(WEBAUTHN_REG_CHALLENGE_KEY) as string | undefined

    if (!attestation || !expectedChallenge) {
      throw new FormError(i18n.t('errors.missingRegistrationPayload'))
    }

    const verification = await webauthnServer.verifyRegistrationResponse({
      response: attestation,
      expectedChallenge,
      expectedOrigin: getOrigin(),
      expectedRPID: getRpId(),
      requireUserVerification: true,
    })

    if (!verification.verified || !verification.registrationInfo) {
      throw new FormError(i18n.t('errors.webauthnVerificationFailed'))
    }

    const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo

    await db()
      .insertInto('webauthnCredentials')
      .values({
        userId: auth.user!.id,
        credentialId: credential.id,
        publicKey: Buffer.from(credential.publicKey).toString('base64url'),
        counter: credential.counter,
        transports: attestation.response?.transports,
        deviceType: credentialDeviceType,
        backedUp: credentialBackedUp,
        friendlyName: friendlyName ?? null,
      })
      .onConflict((oc) => oc.column('credentialId').doNothing())
      .execute()

    session.forget(WEBAUTHN_REG_CHALLENGE_KEY)

    return response.ok({ verified: verification.verified })
  }

  async destroy({ auth, security, params, response }: HttpContext) {
    security.ensureConfirmed()

    const user = auth.user!
    const credential = await db()
      .selectFrom('webauthnCredentials')
      .select(['id', 'userId'])
      .where('id', '=', params.id)
      .where('userId', '=', user.id)
      .executeTakeFirstOrThrow()

    await db().deleteFrom('webauthnCredentials').where('id', '=', credential.id).execute()

    return response.ok(null)
  }
}
