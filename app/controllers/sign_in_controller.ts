import { signInValidator } from '#validators/sign_in_validator'
import type { HttpContext } from '@adonisjs/core/http'

export default class SignInController {
  /**
   * Sign-in form (step 1: email)
   */
  async index({ inertia }: HttpContext) {
    return inertia.render('signIn/index')
  }

  /**
   * Check email and render authentication page (step 2)
   */
  async store({ request, response }: HttpContext) {
    const { email } = await request.validateUsing(signInValidator)
    return response.redirect(`/sign-in/${email}`)
  }
}
