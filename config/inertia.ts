import { policies } from '#policies/main'
import { defineConfig } from '@adonisjs/inertia'
import type { InferSharedProps } from '@adonisjs/inertia/types'

const inertiaConfig = defineConfig({
  /**
   * Path to the Edge view that will be used as the root view for Inertia responses
   */
  rootView: 'inertia_layout',

  /**
   * Data that should be shared with all rendered pages
   */
  sharedData: {
    auth: (ctx) => {
      const { user, isAuthenticated } = ctx.auth.use('web')
      return { isAuthenticated, user }
    },
    policies: async ({ bouncer }) => {
      const res = {} as Record<keyof typeof policies, Record<'index' | 'create', boolean>>

      for (let [name, importer] of Object.entries(policies)) {
        const { default: policy } = await importer()
        res[name as keyof typeof policies] = {
          index: await bouncer.with(policy).allows('index'),
          create: await bouncer.with(policy).allows('create'),
        }
      }
      return res
    },
    exceptions: (ctx) => ctx.session?.flashMessages.get('errorsBag') ?? {},
    messages: (ctx) => ctx.session?.flashMessages.all() ?? {},
  },

  /**
   * Options for the server-side rendering
   */
  ssr: {
    enabled: true,
    entrypoint: 'inertia/app/ssr.tsx',
  },
})

export default inertiaConfig

declare module '@adonisjs/inertia/types' {
  export interface SharedProps extends InferSharedProps<typeof inertiaConfig> {}
}
