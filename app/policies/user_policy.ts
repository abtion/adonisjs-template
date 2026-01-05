import { BasePolicy } from '@adonisjs/bouncer'
import { SessionUser } from '../auth_providers/session_user_provider.js'

export type PolicyUser = { id: number }

export default class UserPolicy extends BasePolicy {
  index(user: SessionUser) {
    return user.admin
  }

  create(user: SessionUser) {
    return user.admin
  }

  show(user: SessionUser, targetUser: PolicyUser) {
    return user.admin || user.id === targetUser.id
  }

  edit(user: SessionUser, targetUser: PolicyUser) {
    return user.admin || user.id === targetUser.id
  }

  destroy(user: SessionUser, targetUser: PolicyUser) {
    return user.admin || user.id === targetUser.id
  }
}
