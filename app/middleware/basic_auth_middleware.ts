import { errors, type HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/**
 * BasicAuth middleware is used to protect routes with HTTP Basic Authentication.
 */
export default class BasicAuthMiddleware {
  async handle(
    ctx: HttpContext,
    next: NextFn,
    options: {
      user: string
      password: string
    }
  ) {
    const authHeader = ctx.request.header('authorization') ?? ''
    const base64Credentials = authHeader.slice(6)

    const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8')
    if (credentials === `${options.user}:${options.password}`) return next()

    ctx.response.header('WWW-Authenticate', 'Basic realm="Restricted Area"')
    throw new errors.E_HTTP_EXCEPTION('Unauthorized', { status: 401 })
  }
}
