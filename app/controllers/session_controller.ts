import FormError from '#exceptions/form_error'
import { db } from '#services/db'
import WebauthnService from '#services/webauthn'
import { createSessionValidator } from '#validators/session_validator'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import hash from '@adonisjs/core/services/hash'
import type { AuthenticationResponseJSON } from '@simplewebauthn/types'
import { setTimeout } from 'node:timers/promises'
import { TOTP_USER_ID_KEY } from './session/totp_controller.js'

export const WEBAUTHN_CHALLENGE_KEY = 'webauthnChallenge'

export default class SessionController {
  @inject()
  async index({ params, session, inertia }: HttpContext, webauthn: WebauthnService) {
    const email = params.email
    const credentials = await db()
      .selectFrom('webauthnCredentials')
      .selectAll()
      .innerJoin('users', 'webauthnCredentials.userId', 'users.id')
      .select(['users.totpEnabled'])
      .where('users.email', '=', email)
      .execute()

    const hasWebauthn = credentials.length > 0
    const requiresOtp = credentials[0]?.totpEnabled ?? false

    let webauthnOptions = null
    if (hasWebauthn) {
      webauthnOptions = await webauthn.getAuthenticationOptions(credentials)
      session.put(WEBAUTHN_CHALLENGE_KEY, webauthnOptions.challenge)
    }

    return inertia.render('session/index', {
      email,
      hasWebauthn,
      requiresOtp,
      webauthnOptions,
    })
  }

  /**
   * Sign in
   */
  @inject()
  async store(context: HttpContext, webauthn: WebauthnService) {
    const { i18n, response, params, request, auth, session } = context
    const data = await request.validateUsing(createSessionValidator)
    const email = params.email

    let needsTotp = false
    const verifyCredentials = async () => {
      const user = await db()
        .selectFrom('users')
        .selectAll()
        .where('users.email', '=', email)
        .executeTakeFirst()

      if (!user) throw new FormError('errors.invalidCredentials')
      if ('password' in data) {
        needsTotp = user.totpEnabled
        if (!(await hash.verify(user.password, data.password))) {
          throw new FormError('errors.invalidCredentials')
        }
      } else {
        const expectedChallenge = session.get(WEBAUTHN_CHALLENGE_KEY)
        if (!expectedChallenge || typeof expectedChallenge !== 'string') {
          throw new FormError('errors.missingAuthenticationPayload')
        }

        await webauthn
          .verifyAuthentication(data.assertion as AuthenticationResponseJSON, expectedChallenge)
          .catch(FormError.catcher)
        session.forget(WEBAUTHN_CHALLENGE_KEY)
      }

      return user
    }

    // Prevent timing attacks by ensuring the function always takes 100ms
    const [authResult] = await Promise.allSettled([verifyCredentials(), setTimeout(100)])
    if (authResult.status !== 'fulfilled') throw authResult.reason

    const user = authResult.value

    if (needsTotp) {
      session.put(TOTP_USER_ID_KEY, user.id)
      return response.redirect().toRoute(`/session/totp`)
    }

    session.forget(TOTP_USER_ID_KEY)
    await auth.use('web').login(user)
    session.flash('notice', i18n.t('notices.signedIn'))
    return response.redirect('/')
  }

  /**
   * Delete session
   */
  async destroy({ response, i18n, auth, session }: HttpContext) {
    await auth.use('web').logout()

    session.clear()
    session.flash('notice', i18n.t('notices.signedOut'))
    return response.redirect('/')
  }
}
