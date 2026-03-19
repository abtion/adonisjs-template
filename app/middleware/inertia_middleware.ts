import { policies } from '#policies/main'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import BaseInertiaMiddleware from '@adonisjs/inertia/inertia_middleware'

export default class InertiaMiddleware extends BaseInertiaMiddleware {
  async share(ctx: HttpContext) {
    /**
     * The share method is called everytime an Inertia page is rendered. In
     * certain cases, a page may get rendered before the session middleware
     * or the auth middleware are executed. For example: During a 404 request.
     *
     * In that case, we must always assume that HttpContext is not fully hydrated
     * with all the properties
     */
    const { session, auth, i18n, bouncer } = ctx as Partial<HttpContext>

    /**
     * CRUD collection policies
     */
    const policiesData = async () => {
      const res = {} as Record<keyof typeof policies, Record<'index' | 'create', boolean>>
      for (const [name, importer] of Object.entries(policies)) {
        const { default: policy } = await importer()
        res[name as keyof typeof policies] = {
          index: (await bouncer?.with(policy).allows('index')) || false,
          create: (await bouncer?.with(policy).allows('create')) || false,
        }
      }
      return res
    }

    /**
     * Current authenticated user
     */
    let user
    if (auth?.user) {
      const { name, admin, id, email } = auth.user
      user = { name, admin, id, email }
    }

    /**
     * Data shared with all Inertia pages. Make sure you are using
     * transformers for rich data-types like Models.
     */
    return {
      locale: ctx.inertia.always(i18n?.locale),
      policies: await policiesData(),
      errors: ctx.inertia.always({
        ...this.getValidationErrors(ctx),
        ...(session?.flashMessages.get('errorsBag') ?? {}),
      }),
      user: ctx.inertia.always(user),
      messages: ctx.inertia.always(session?.flashMessages.all() ?? {}),
    }
  }

  async handle(ctx: HttpContext, next: NextFn) {
    await this.init(ctx)

    const output = await next()
    this.dispose(ctx)

    return output
  }
}

declare module '@adonisjs/inertia/types' {
  type MiddlewareSharedProps = import('@adonisjs/inertia/types').InferSharedProps<InertiaMiddleware>
  export interface SharedProps extends MiddlewareSharedProps {}
}
