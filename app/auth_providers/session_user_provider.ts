import type { Users } from '../../database/types.js'

import { Selectable } from 'kysely'
import { symbols } from '@adonisjs/auth'
import { SessionGuardUser, SessionUserProviderContract } from '@adonisjs/auth/types/session'
import { db } from '#services/db'

export type SessionUser = Omit<
  Pick<
    Selectable<Users>,
    | 'id'
    | 'email'
    | 'name'
    | 'admin'
    | 'isTwoFactorEnabled'
    | 'twoFactorSecret'
    | 'twoFactorRecoveryCodes'
  >,
  'twoFactorRecoveryCodes'
>

export class SessionKyselyUserProvider implements SessionUserProviderContract<SessionUser> {
  declare [symbols.PROVIDER_REAL_USER]: SessionUser

  async createUserForGuard(user: SessionUser): Promise<SessionGuardUser<SessionUser>> {
    return {
      getId() {
        return user.id
      },
      getOriginal() {
        return user
      },
    }
  }

  async findById(identifier: number): Promise<SessionGuardUser<SessionUser> | null> {
    const user = await db()
      .selectFrom('users')
      .select([
        'id',
        'email',
        'name',
        'admin',
        'isTwoFactorEnabled',
        'twoFactorSecret',
        'twoFactorRecoveryCodes',
      ])
      .where('id', '=', identifier)
      .executeTakeFirst()

    /* v8 ignore next */
    if (!user) return null

    return this.createUserForGuard(user)
  }
}
