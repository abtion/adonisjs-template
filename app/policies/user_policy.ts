import { BasePolicy } from '@adonisjs/bouncer'
import { AuthorizerResponse } from '@adonisjs/bouncer/types'
import { SessionUser } from '../auth_providers/session_user_provider.js'
import type { Users } from '../../database/types.js'
import { Selectable } from 'kysely'

export type PolicyUser = { id: number }

export default class UserPolicy extends BasePolicy {
  index(user: SessionUser): AuthorizerResponse {
    return user.admin
  }

  create(user: SessionUser): AuthorizerResponse {
    return user.admin
  }

  show(user: SessionUser, targetUser: PolicyUser): AuthorizerResponse {
    return user.id === targetUser.id
  }

  edit(user: SessionUser, targetUser: PolicyUser): AuthorizerResponse {
    return user.id === targetUser.id
  }

  destroy(user: SessionUser, targetUser: PolicyUser): AuthorizerResponse {
    return user.id === targetUser.id
  }
}
