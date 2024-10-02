import type { Users } from '../../database/types.js'

import { Selectable } from 'kysely'
import { symbols } from '@adonisjs/auth'
import { SessionGuardUser, SessionUserProviderContract } from '@adonisjs/auth/types/session'
import { db } from '#services/db'

type User = Selectable<Users>

export class SessionKyselyUserProvider implements SessionUserProviderContract<User> {
  declare [symbols.PROVIDER_REAL_USER]: User

  async createUserForGuard(user: User): Promise<SessionGuardUser<User>> {
    return {
      getId() {
        return user.id
      },
      getOriginal() {
        return user
      },
    }
  }

  async findById(identifier: number): Promise<SessionGuardUser<User> | null> {
    const user = await db()
      .selectFrom('users')
      .selectAll()
      .where('id', '=', identifier)
      .executeTakeFirst()

    if (!user) {
      return null
    }

    return this.createUserForGuard(user)
  }
}
