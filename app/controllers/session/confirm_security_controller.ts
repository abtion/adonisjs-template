import FormError from '#exceptions/form_error'
import { db } from '#services/db'
import WebauthnService from '#services/webauthn'
import { confirmSecurityValidator } from '#validators/session/confirm_security'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import hash from '@adonisjs/core/services/hash'
import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/types'
import { setTimeout } from 'node:timers/promises'

export const SECURITY_CONFIRMATION_CHALLENGE_KEY = 'securityConfirmationChallenge'

export default class ProfileConfirmSecurityController {
  @inject()
  async index({ auth, session, response }: HttpContext, webauthn: WebauthnService) {
    const user = auth.user!
    const credentials = await db()
      .selectFrom('webauthnCredentials')
      .selectAll()
      .where('webauthnCredentials.userId', '=', user.id)
      .execute()

    let options: PublicKeyCredentialRequestOptionsJSON | null = null
    if (credentials.length) {
      options = await webauthn.getAuthenticationOptions(credentials)
      session.put(SECURITY_CONFIRMATION_CHALLENGE_KEY, options.challenge)
    }

    return response.ok({ options, hasWebauthn: credentials.length > 0 })
  }

  @inject()
  async store(
    { auth, security, request, session, response }: HttpContext,
    webauthn: WebauthnService
  ) {
    const user = auth.user!
    const data = await request.validateUsing(confirmSecurityValidator)

    const verifyCredentials = async () => {
      if ('password' in data) {
        if (!(await hash.verify(user.password, data.password))) {
          throw new FormError('errors.verificationFailed')
        }
      } else {
        const expectedChallenge = session.get(SECURITY_CONFIRMATION_CHALLENGE_KEY)
        if (!expectedChallenge || typeof expectedChallenge !== 'string') {
          throw new FormError('errors.missingAuthenticationPayload')
        }

        await webauthn
          .verifyAuthentication(data.assertion as AuthenticationResponseJSON, expectedChallenge)
          .catch(FormError.catcher)
        session.forget(SECURITY_CONFIRMATION_CHALLENGE_KEY)
      }

      return user
    }

    // Prevent timing attacks by ensuring the function always takes 100ms
    const [authResult] = await Promise.allSettled([verifyCredentials(), setTimeout(100)])
    if (authResult.status !== 'fulfilled') throw authResult.reason

    security.confirm()

    return response.ok({ confirmed: true })
  }
}
