import type { HttpContext } from '@adonisjs/core/http'
import type { RegistrationResponseJSON } from '@simplewebauthn/types'

import FormError from '#exceptions/form_error'
import { db } from '#services/db'
import WebauthnService from '#services/webauthn'
import { inject } from '@adonisjs/core'

export const WEBAUTHN_REG_CHALLENGE_KEY = 'webauthnRegistrationChallenge'

export default class ProfileWebauthnController {
  @inject()
  async options({ auth, security, session }: HttpContext, webauthn: WebauthnService) {
    security.ensureConfirmed()

    const user = auth.user!
    const existing = await db()
      .selectFrom('webauthnCredentials')
      .select('credentialId')
      .where('webauthnCredentials.userId', '=', user.id)
      .execute()

    const options = await webauthn.getRegistrationOptions(user, existing)

    session.put(WEBAUTHN_REG_CHALLENGE_KEY, options.challenge)

    return { options }
  }

  @inject()
  async store(
    { auth, security, request, session, response }: HttpContext,
    webauthn: WebauthnService
  ) {
    security.ensureConfirmed()

    const attestation = request.input('attestation') as RegistrationResponseJSON | undefined
    const friendlyName = request.input('friendlyName') as string | undefined
    const expectedChallenge = session.get(WEBAUTHN_REG_CHALLENGE_KEY) as string | undefined

    if (!attestation || !expectedChallenge) {
      throw new FormError('errors.missingRegistrationPayload')
    }

    const verification = await webauthn
      .verifyRegistration(attestation, expectedChallenge)
      .catch(FormError.catcher)

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
