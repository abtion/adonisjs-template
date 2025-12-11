import type { HttpContext } from '@adonisjs/core/http'
import { loadUserWithTwoFactor, userHasWebauthnCredentials } from '#services/two_factor'
import twoFactorAuth from '@nulix/adonis-2fa/services/main'
import { db } from '#services/db'
import { sql } from 'kysely'

const parseRecoveryCodes = (codes: unknown): string[] => {
  if (Array.isArray(codes)) return codes as string[]
  if (typeof codes === 'string') {
    try {
      return JSON.parse(codes)
    } catch {
      return []
    }
  }
  return []
}

export default class ProfileController {
  async show({ auth, inertia }: HttpContext) {
    const user = await loadUserWithTwoFactor(auth.user!.id)
    const hasWebauthn = await userHasWebauthnCredentials(user.id)
    const recoveryCodes = parseRecoveryCodes(user.twoFactorRecoveryCodes)

    const webauthnCredentials = await db()
      .selectFrom('webauthnCredentials')
      .select(['id', 'friendlyName', 'createdAt', 'updatedAt'])
      .where('userId', '=', user.id)
      .orderBy('createdAt', 'desc')
      .execute()

    return inertia.render('profile/index', {
      user: {
        name: user.name,
        email: user.email,
      },
      twoFactor: {
        enabled: user.isTwoFactorEnabled,
        hasWebauthn,
        recoveryCodesCount: recoveryCodes.length,
      },
      passkeys: webauthnCredentials.map((cred) => ({
        id: cred.id,
        friendlyName: cred.friendlyName,
        createdAt: cred.createdAt,
        lastUsed: cred.updatedAt,
      })),
    })
  }

  async enable({ auth, response }: HttpContext) {
    const user = await loadUserWithTwoFactor(auth.user!.id)

    if (user.isTwoFactorEnabled) {
      return response.badRequest({ message: 'Two-factor authentication is already enabled' })
    }

    const secret = await twoFactorAuth.generateSecret(user.email)
    const recoveryCodes = twoFactorAuth.generateRecoveryCodes()

    await db()
      .updateTable('users')
      .set({
        twoFactorSecret: sql`cast(${JSON.stringify(secret)} as jsonb)`,
        twoFactorRecoveryCodes: sql`cast(${JSON.stringify(recoveryCodes)} as jsonb)`,
        isTwoFactorEnabled: false,
      })
      .where('users.id', '=', user.id)
      .execute()

    return response.ok({ secret, recoveryCodes })
  }

  async removePasskey({ auth, request, response }: HttpContext) {
    const user = await loadUserWithTwoFactor(auth.user!.id)
    const credentialId = request.param('id')

    if (!credentialId) {
      return response.badRequest({ message: 'Credential ID is required' })
    }

    // Verify the credential belongs to the user
    const credential = await db()
      .selectFrom('webauthnCredentials')
      .select(['id', 'userId'])
      .where('id', '=', Number(credentialId))
      .where('userId', '=', user.id)
      .executeTakeFirst()

    if (!credential) {
      return response.notFound({ message: 'Passkey not found' })
    }

    await db()
      .deleteFrom('webauthnCredentials')
      .where('id', '=', Number(credentialId))
      .where('userId', '=', user.id)
      .execute()

    return response.ok({ message: 'Passkey removed successfully' })
  }
}
