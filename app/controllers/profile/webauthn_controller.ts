import type { HttpContext } from '@adonisjs/core/http'

import FormError from '#exceptions/form_error'
import { db } from '#services/db'
import { queueSecuritySettingsChangedMail } from '#services/security_settings_notifications'
import WebauthnService from '#services/webauthn'
import { createOtpValidator } from '#validators/profile/webauthn_validator'
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

    const [error, result] = await request.tryValidateUsing(createOtpValidator)

    const expectedChallenge = session.get(WEBAUTHN_REG_CHALLENGE_KEY) as string | undefined
    if (error || !expectedChallenge) {
      throw new FormError('missingRegistrationPayload')
    }

    const { attestation, friendlyName } = result!
    const verification = await webauthn
      .verifyRegistration(attestation, expectedChallenge)
      .catch(FormError.catcher)

    const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo

    const insertedCredential = await db()
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
      .returning(['id'])
      .executeTakeFirst()

    session.forget(WEBAUTHN_REG_CHALLENGE_KEY)

    if (insertedCredential) {
      await queueSecuritySettingsChangedMail(auth.user!, {
        type: 'passkey_added',
        credentialName: friendlyName ?? null,
      })
    }

    return response.ok({ verified: verification.verified })
  }

  async destroy({ auth, security, params, response }: HttpContext) {
    security.ensureConfirmed()

    const user = auth.user!
    const credential = await db()
      .selectFrom('webauthnCredentials')
      .select(['id', 'userId', 'friendlyName'])
      .where('id', '=', params.id)
      .where('userId', '=', user.id)
      .executeTakeFirstOrThrow()

    await db().deleteFrom('webauthnCredentials').where('id', '=', credential.id).execute()

    await queueSecuritySettingsChangedMail(user, {
      type: 'passkey_removed',
      credentialName: credential.friendlyName,
    })

    return response.ok(null)
  }
}
