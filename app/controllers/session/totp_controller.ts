import { db } from '#services/db'
import { type HttpContext } from '@adonisjs/core/http'

export const TOTP_USER_ID_KEY = 'TotpUserId'

import { postOtpValidator } from '#validators/session/totp_validator'
import encryption from '@adonisjs/core/services/encryption'
import adonis2fa from '@nulix/adonis-2fa/services/main'
import FormError from '#exceptions/form_error'

const getUserById = async (id: number) =>
  await db().selectFrom('users').selectAll().where('users.id', '=', id).executeTakeFirst()

export default class SessionTotpController {
  async index({ session, i18n, inertia, response }: HttpContext) {
    const user = await getUserById(session.get(TOTP_USER_ID_KEY))
    if (!user) {
      session.flash('error', i18n.t('errors.noLoginSession'))
      return response.redirect('/')
    }

    return inertia.render('session/totp')
  }

  async store({ auth, session, request, response, i18n }: HttpContext) {
    const { otp } = await request.validateUsing(postOtpValidator)
    const user = await getUserById(session.get(TOTP_USER_ID_KEY))

    if (!user) {
      session.flash('error', i18n.t('errors.noLoginSession'))
      return response.redirect('/')
    }
    const totpSecret = encryption.decrypt<string>(user.totpSecretEncrypted)

    if (!totpSecret) {
      throw new FormError('errors.totpSecretNotGenerated')
    }

    const isValid = adonis2fa.verifyToken(totpSecret, otp, [])
    if (!isValid) {
      throw new FormError('errors.otpInvalid')
    }

    session.forget(TOTP_USER_ID_KEY)
    await auth.use('web').login(user)

    session.flash('notice', i18n.t('notices.signedIn'))

    return response.redirect('/')
  }
}
