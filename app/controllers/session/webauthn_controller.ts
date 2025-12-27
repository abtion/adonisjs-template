import FormError from '#exceptions/form_error'
import { db } from '#services/db'
import { fromBase64Url, getOrigin, getRpId } from '#services/webauthn_service'
import type { HttpContext } from '@adonisjs/core/http'
import * as webauthnServer from '@simplewebauthn/server'
import { AuthenticationResponseJSON } from '@simplewebauthn/types'

const WEBAUTHN_CHALLENGE_KEY = 'webauthnChallenge'

export default class SessionWebauthnsController {
  async index({ params, session, response }: HttpContext) {
    const credentials = await db()
      .selectFrom('webauthnCredentials')
      .selectAll()
      .innerJoin('users', 'webauthnCredentials.userId', 'users.id')
      .where('users.email', '=', params.email)
      .execute()

    const allowCredentials = credentials.map((credential) => ({
      id: credential.credentialId,
      type: 'public-key' as const,
      transports: credential.transports,
    }))

    const options = await webauthnServer.generateAuthenticationOptions({
      rpID: getRpId(),
      userVerification: 'preferred',
      allowCredentials,
    })

    session.put(WEBAUTHN_CHALLENGE_KEY, options.challenge)

    return response.ok(options)
  }

  /**
   * Verify passwordless WebAuthn authentication and log in
   */
  async store({ request, response, auth, session, i18n }: HttpContext) {
    const assertion = request.input('assertion') as AuthenticationResponseJSON | undefined
    const expectedChallenge = session.get(WEBAUTHN_CHALLENGE_KEY) as string | undefined

    if (!assertion || !expectedChallenge) {
      throw new FormError(i18n.t('errors.missingAuthenticationPayload'))
    }

    const credential = await db()
      .selectFrom('webauthnCredentials')
      .selectAll()
      .where('webauthnCredentials.credentialId', '=', assertion.id)
      .executeTakeFirst()

    if (!credential) throw new FormError(i18n.t('errors.credentialNotFound'))

    const verification = await webauthnServer.verifyAuthenticationResponse({
      response: assertion,
      expectedChallenge,
      expectedOrigin: getOrigin(),
      expectedRPID: getRpId(),
      credential: {
        id: credential.credentialId,
        publicKey: fromBase64Url(credential.publicKey),
        counter: credential.counter,
        transports: credential.transports,
      },
      requireUserVerification: true,
    })

    if (!verification.verified || !verification.authenticationInfo) {
      throw new FormError(i18n.t('errors.webauthnVerificationFailed'))
    }

    await db()
      .updateTable('webauthnCredentials')
      .set({
        counter: verification.authenticationInfo.newCounter,
        updatedAt: new Date(),
      })
      .where('id', '=', credential.id)
      .execute()

    const user = await db()
      .selectFrom('users')
      .selectAll()
      .where('users.id', '=', credential.userId)
      .executeTakeFirst()

    if (!user) throw new FormError(i18n.t('errors.userNotFound'))

    await auth.use('web').login(user)

    return response.ok(null)
  }
}
