import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import type { Authenticators } from '@adonisjs/auth/types'
import BaseError from '#exceptions/base_error'

const SECURITY_CONFIRMATION_SESSION_KEY = 'securityConfirmedAt'
const SECURITY_CONFIRMATION_TIMEOUT_MS = 5 * 60 * 1000

/**
 * Auth middleware is used authenticate HTTP requests and deny
 * access to unauthenticated users.
 */
export default class AuthMiddleware {
  /**
   * The URL to redirect to, when authentication fails
   */
  redirectTo = '/sign-in'

  async handle(
    ctx: HttpContext,
    next: NextFn,
    options: {
      guards?: (keyof Authenticators)[]
    } = {}
  ) {
    await ctx.auth.authenticateUsing(options.guards, {
      loginRoute: this.redirectTo,
    })

    ctx.security = {
      confirm: () => ctx.session.put(SECURITY_CONFIRMATION_SESSION_KEY, Date.now()),
      ensureConfirmed: () => {
        const confirmedAt = new Date(ctx.session.get(SECURITY_CONFIRMATION_SESSION_KEY)).getTime()
        const confirmed = Date.now() - confirmedAt <= SECURITY_CONFIRMATION_TIMEOUT_MS
        if (!confirmed) throw new BaseError('security_confirmation_required', 401)
      },
    }

    return next()
  }
}

declare module '@adonisjs/core/http' {
  export interface HttpContext {
    security: {
      confirm: () => void
      ensureConfirmed: () => void
    }
  }
}
