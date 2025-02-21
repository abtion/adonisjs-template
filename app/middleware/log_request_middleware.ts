import logRequest from '#utils/log_request'
import { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

export default class InitializeRequestLoggerMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const startTime = process.hrtime.bigint()
    logRequest(ctx, startTime)
    return next()
  }
}
