import { db } from '#services/db'
import { createSessionValidator } from '#validators/session_validator'
import hash from '@adonisjs/core/services/hash'
import { setTimeout } from 'node:timers/promises'
import { errors } from '@adonisjs/auth'
import type { HttpContext } from '@adonisjs/core/http'
import { TOTP_USER_ID_KEY } from './session/totp_controller.js'
import FormError from '#exceptions/form_error'

export default class SessionController {
  /**
   * Sign-in form
   */
  async show({ inertia }: HttpContext) {
    return inertia.render('session/signIn', {
      step: 'email',
    })
  }

  /**
   * Sign in
   */
  async store({ i18n, response, request, auth, session }: HttpContext) {
    const data = await request.validateUsing(createSessionValidator)

    const findAndVerifyUser = async () => {
      const user = await db()
        .selectFrom('users')
        .selectAll()
        .where('users.email', '=', data.email)
        .executeTakeFirst()
      if (!user) return null

      const isPasswordValid = await hash.verify(user.password, data.password)
      return isPasswordValid ? user : null
    }

    // Prevent timing attacks by ensuring the function always takes 50ms
    const [verifiedUser] = await Promise.all([findAndVerifyUser(), setTimeout(50)])
    if (!verifiedUser) throw new FormError(i18n.t('errors.invalidCredentials'))

    const needsTotp = verifiedUser.totpEnabled
    if (needsTotp) {
      session.put(TOTP_USER_ID_KEY, verifiedUser.id)
      return response.redirect().toRoute('/session/totp')
    }

    session.forget(TOTP_USER_ID_KEY)
    await auth.use('web').login(verifiedUser)
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
