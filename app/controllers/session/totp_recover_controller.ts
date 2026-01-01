import { db } from '#services/db'
import type { HttpContext } from '@adonisjs/core/http'

import { postOtpRecoverValidator } from '#validators/session/totp_recover_validator'
import encryption from '@adonisjs/core/services/encryption'
import { TOTP_USER_ID_KEY } from './totp_controller.js'
import FormError from '#exceptions/form_error'

const getUserById = async (id: number) =>
  await db().selectFrom('users').selectAll().where('users.id', '=', id).executeTakeFirst()

export default class SessionTotpRecoverController {
  async index({ session, inertia, response }: HttpContext) {
    const user = await getUserById(session.get(TOTP_USER_ID_KEY))

    if (!user) return response.unauthorized()
    const { totpRecoveryCodesEncrypted } = user
    const recoveryCodes = encryption.decrypt<string[]>(totpRecoveryCodesEncrypted)

    return inertia.render('session/totpRecover', {
      canRecover: (recoveryCodes ?? []).length > 0,
    })
  }

  async store({ auth, session, request, response }: HttpContext) {
    const { recoveryCode } = await request.validateUsing(postOtpRecoverValidator)
    const user = await getUserById(session.get(TOTP_USER_ID_KEY))

    if (!user) return response.unauthorized()

    const { totpSecretEncrypted, totpRecoveryCodesEncrypted } = user
    const totpSecret = encryption.decrypt<string>(totpSecretEncrypted)
    const totpRecoveryCodes = encryption.decrypt<string[]>(totpRecoveryCodesEncrypted)
    if (!totpSecret || !totpRecoveryCodes) {
      throw new FormError('errors.totpSecretNotGenerated')
    }

    let isValid: boolean = false
    const remainingCodes = totpRecoveryCodes.filter((code) => {
      if (code !== recoveryCode) return true

      isValid = true
      return false
    })

    if (!isValid) {
      throw new FormError('errors.recoveryCodeInvalid')
    }

    session.forget(TOTP_USER_ID_KEY)

    await db()
      .updateTable('users')
      .set({ totpRecoveryCodesEncrypted: encryption.encrypt(remainingCodes) })
      .where('users.id', '=', user.id)
      .execute()

    await auth.use('web').login(user)

    return response.redirect('/')
  }
}
