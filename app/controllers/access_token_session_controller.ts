import { db } from '#services/db'
import { createSessionValidator } from '#validators/session_validator'
import { errors } from '@adonisjs/auth'
import { HttpContext } from '@adonisjs/core/http'
import { setTimeout } from 'node:timers/promises'

import hash from '@adonisjs/core/services/hash'

export default class SessionController {
  async store({ request, auth }: HttpContext) {
    const data = await request.validateUsing(createSessionValidator)

    const findAndVerifyUser = async () => {
      const user = await db()
        .selectFrom('users')
        .selectAll()
        .where('users.email', '=', data.email)
        .executeTakeFirst()
      if (!user) return null

      const isPasswordValid = await hash.verify(user.password, data.password)
      return isPasswordValid ? user : null
    }

    const [verifiedUser] = await Promise.all([findAndVerifyUser(), setTimeout(50)])
    if (!verifiedUser)
      throw new errors.E_UNAUTHORIZED_ACCESS('Invalid credentials', { guardDriverName: 'api' })

    return await auth.use('api').createToken(verifiedUser)
  }

  async delete({ auth }: HttpContext) {
    await auth.use('api').invalidateToken()
  }
}
