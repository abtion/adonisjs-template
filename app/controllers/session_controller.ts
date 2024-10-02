import type { HttpContext } from '@adonisjs/core/http'

export default class SessionController {
  /**
   * Sign-in form
   */
  async index({ inertia }: HttpContext) {
    return inertia.render('session/index', { session: { email: '', password: '' } })
  }

  /**
   * Sign-in
   */
  async store({ inertia, request }: HttpContext) {
    const body = request.body()
    const { success, data, error } = await this.parsedCreateBody(body)

    if (success) {
    } else {
    }
  }

  /**
   * Delete session
   */
  async destroy({ params, response }: HttpContext) {
    return response.redirect('/')
  }
}
