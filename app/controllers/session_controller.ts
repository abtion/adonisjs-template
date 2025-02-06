import { db } from '#services/db'
import { createSessionValidator } from '#validators/session_validator'
import hash from '@adonisjs/core/services/hash'
import { setTimeout } from 'node:timers/promises'
import { errors } from '@adonisjs/auth'
import type { HttpContext } from '@adonisjs/core/http'

export default class SessionController {
  /**
   * Sign-in form
   */
  async show({ inertia }: HttpContext) {
    return inertia.render('session/signIn')
  }

  /**
   * Sign in
   */
  async store({ response, request, auth }: HttpContext) {
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

    if (!verifiedUser) throw new errors.E_INVALID_CREDENTIALS('Invalid credentials')

    await auth.use('web').login(verifiedUser)

    response.redirect('/')
  }

  /**
   * Delete session
   */
  async destroy({ response, auth }: HttpContext) {
    await auth.use('web').logout()
    return response.redirect('/')
  }
}
