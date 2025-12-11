import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

import { isTwoFactorPassed } from '#services/two_factor'

export default class TwoFactorMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const user = ctx.auth.user

    if (!user) {
      return next()
    }

    const routeName = ctx.route?.name ?? ''
    const isTwoFactorRoute = routeName.startsWith('2fa.') || ctx.request.url().startsWith('/2fa')

    if (isTwoFactorRoute) {
      return next()
    }

    // Only OTP requires 2FA challenge - passkeys are handled separately
    const needsTwoFactor = user.isTwoFactorEnabled

    if (!needsTwoFactor || isTwoFactorPassed(ctx.session)) {
      return next()
    }

    return ctx.response.redirect().toRoute('2fa.challenge')
  }
}
