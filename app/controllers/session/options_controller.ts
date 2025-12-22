import { db } from '#services/db'
import type { HttpContext } from '@adonisjs/core/http'

export default class SessionOptionsController {
  async handle({ params, response }: HttpContext) {
    const info = await db()
      .selectFrom('users')
      .leftJoin('webauthnCredentials', 'webauthnCredentials.userId', 'users.id')
      .select(['totpEnabled'])
      .select(({ fn }) => [
        'totpEnabled',
        fn.count<number>('webauthnCredentials.id').as('credentialsCount'),
      ])
      .where('users.email', '=', params.email)
      .groupBy('users.id')
      .executeTakeFirst()

    return response.ok({
      hasWebauthn: (info?.credentialsCount ?? 0) > 0,
      requiresOtp: info?.totpEnabled ?? false,
    })
  }
}
