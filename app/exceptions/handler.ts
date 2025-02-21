import app from '@adonisjs/core/services/app'
import { HttpContext, ExceptionHandler, errors } from '@adonisjs/core/http'
import type { StatusPageRange, StatusPageRenderer } from '@adonisjs/core/types/http'
import { errors as bouncerErrors } from '@adonisjs/bouncer'
import logRequest from '#utils/log_request'
import * as Kysely from 'kysely'

export default class HttpExceptionHandler extends ExceptionHandler {
  /**
   * In debug mode, the exception handler will display verbose errors
   * with pretty printed stack traces.
   */
  protected debug = !app.inProduction

  /**
   * Status pages are used to display a custom HTML pages for certain error
   * codes. You might want to enable them in production only, but feel
   * free to enable them in development as well.
   */
  protected renderStatusPages = true //app.inProduction

  /**
   * Status pages is a collection of error code range and a callback
   * to return the HTML contents to send as a response.
   */
  protected statusPages: Record<StatusPageRange, StatusPageRenderer> = {
    /* v8 ignore start */
    '404': (error, ctx) => {
      logRequest(ctx)
      return ctx.inertia.render('errors/notFound', { error, requestId: ctx.request.id() })
    },
    '500..599': (error, { inertia, request }) =>
      inertia.render('errors/serverError', { error, requestId: request.id() }),
    /* v8 ignore end */
  }

  /**
   * The method is used for handling errors and returning
   * response to the client
   */
  async handle(error: unknown, ctx: HttpContext) {
    if (error instanceof bouncerErrors.E_AUTHORIZATION_FAILURE) {
      if (ctx.session) {
        ctx.session.flashErrors({ [error.code]: error.message })
        ctx.response.redirect('back', true)
      } else {
        ctx.response.status(error.status).send(error.message)
      }
      return
    }

    if (error instanceof Kysely.NoResultError) {
      error = new errors.E_HTTP_EXCEPTION('Not found', { status: 404 })
    }

    return super.handle(error, ctx)
  }

  /**
   * The method is used to report error to the logging service or
   * the a third party error monitoring service.
   *
   * @note You should not attempt to send a response from this method.
   */
  async report(error: unknown, ctx: HttpContext) {
    return super.report(error, ctx)
  }
}
