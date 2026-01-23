import { errors, type HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

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
    const credentials = Buffer.from(base64Credentials, 'base64')
    const expected = Buffer.from(`${options.user}:${options.password}`)
    const key = randomBytes(32)
    const hmacUser = createHmac('sha256', key).update(credentials).digest()
    const hmacSecret = createHmac('sha256', key).update(expected).digest()
    if (timingSafeEqual(hmacUser, hmacSecret)) return next()

    ctx.response.header('WWW-Authenticate', 'Basic realm="Restricted Area"')
    throw new errors.E_HTTP_EXCEPTION('Unauthorized', { status: 401 })
  }
}
