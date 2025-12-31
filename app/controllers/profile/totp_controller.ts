import adonis2fa from '@nulix/adonis-2fa/services/main'
import type { HttpContext } from '@adonisjs/core/http'

import { db } from '#services/db'
import encryption from '@adonisjs/core/services/encryption'
import { postOtpValidator } from '#validators/profile/totp_validator'
import FormError from '#exceptions/form_error'

export default class ProfileTotpController {
  async store({ auth, security, response }: HttpContext) {
    security.ensureConfirmed()

    const user = auth.user!
    if (user.totpEnabled) throw new FormError('errors.totpAlreadyEnabled')

    const secret = await adonis2fa.generateSecret(user.email)
    const recoveryCodes = adonis2fa.generateRecoveryCodes()

    await db()
      .updateTable('users')
      .set({
        totpSecretEncrypted: encryption.encrypt(secret.secret),
        totpRecoveryCodesEncrypted: encryption.encrypt(recoveryCodes),
      })
      .where('users.id', '=', user.id)
      .execute()

    return response.ok({ secret, recoveryCodes })
  }

  async verify({ auth, request, response }: HttpContext) {
    const { otp } = await request.validateUsing(postOtpValidator)
    const user = auth.user!

    const totpSecret = encryption.decrypt<string>(user.totpSecretEncrypted)
    const totpRecoveryCodes = encryption.decrypt<string[]>(user.totpRecoveryCodesEncrypted)

    if (!totpSecret || !totpRecoveryCodes) {
      throw new FormError('errors.totpSecretNotGenerated')
    }

    const isValid = adonis2fa.verifyToken(totpSecret, otp, totpRecoveryCodes)
    if (!isValid) throw new FormError('errors.otpInvalid')

    await db()
      .updateTable('users')
      .set({ totpEnabled: true })
      .where('users.id', '=', user.id)
      .execute()

    return response.ok(null)
  }

  async destroy({ auth, response, security }: HttpContext) {
    const user = auth.user!
    if (!user.totpEnabled) throw new FormError('errors.userWithout2FAActive')

    security.ensureConfirmed()

    await db()
      .updateTable('users')
      .set({
        totpEnabled: false,
        totpSecretEncrypted: null,
        totpRecoveryCodesEncrypted: null,
      })
      .where('users.id', '=', user.id)
      .execute()

    return response.noContent()
  }

  async regenerateRecoveryCodes({ auth, security }: HttpContext) {
    const user = auth.user!

    if (!user.totpEnabled) throw new FormError('errors.userWithout2FAActive')

    security.ensureConfirmed()

    const recoveryCodes = adonis2fa.generateRecoveryCodes()

    await db()
      .updateTable('users')
      .set({ totpRecoveryCodesEncrypted: encryption.encrypt(recoveryCodes) })
      .where('users.id', '=', user.id)
      .execute()

    return { recoveryCodes }
  }
}
