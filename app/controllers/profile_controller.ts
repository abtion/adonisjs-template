import { db } from '#services/db'
import type { HttpContext } from '@adonisjs/core/http'
import encryption from '@adonisjs/core/services/encryption'

export default class ProfileController {
  async show({ auth, inertia }: HttpContext) {
    const user = auth.user!
    const recoveryCodes = encryption.decrypt<string[]>(user.totpRecoveryCodesEncrypted!)

    const credentials = await db()
      .selectFrom('webauthnCredentials')
      .select(['id', 'friendlyName', 'createdAt', 'updatedAt'])
      .where('userId', '=', user.id)
      .orderBy('createdAt', 'desc')
      .execute()

    return inertia.render('profile/index', {
      totp: {
        enabled: user.totpEnabled,
        recoveryCodesCount: (recoveryCodes ?? []).length,
      },
      credentials,
    })
  }
}
