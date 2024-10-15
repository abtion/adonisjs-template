import { BasePolicy } from '@adonisjs/bouncer'
import { AuthorizerResponse } from '@adonisjs/bouncer/types'
import { SessionUser } from '../auth_providers/session_user_provider.js'
import type { Books } from '../../database/types.js'
import { Selectable } from 'kysely'

type Book = Selectable<Books>

export default class BookPolicy extends BasePolicy {
  index(_user: SessionUser): AuthorizerResponse {
    return true
  }

  create(_user: SessionUser): AuthorizerResponse {
    return true
  }

  show(_user: SessionUser, _book: Book): AuthorizerResponse {
    return true
  }

  edit(_user: SessionUser, _book: Book): AuthorizerResponse {
    return true
  }

  delete(_user: SessionUser, _book: Book): AuthorizerResponse {
    return true
  }
}
