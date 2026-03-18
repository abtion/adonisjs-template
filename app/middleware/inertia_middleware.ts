import { policies } from '#policies/main'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import BaseInertiaMiddleware from '@adonisjs/inertia/inertia_middleware'

export default class InertiaMiddleware extends BaseInertiaMiddleware {
  async share(ctx: HttpContext) {
    const { session, auth, i18n, bouncer } = ctx as Partial<HttpContext>

    const authData = (() => {
      const { user, isAuthenticated } = auth?.use('web') ?? {
        user: undefined,
        isAuthenticated: false,
      }

      let inertiaUser
      if (user) {
        const { name, admin, id, email } = user
        inertiaUser = { name, admin, id, email }
      }

      return { isAuthenticated, user: inertiaUser }
    })()

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

    return {
      locale: ctx.inertia.always(i18n?.locale),
      auth: ctx.inertia.always(authData),
      policies: await policiesData(),
      errors: ctx.inertia.always({
        ...this.getValidationErrors(ctx),
        ...(session?.flashMessages.get('errorsBag') ?? {}),
      }),
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
