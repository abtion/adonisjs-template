import { defineConfig } from '@adonisjs/auth'
import { tokensGuard } from '@adonisjs/auth/access_tokens'
import { sessionGuard } from '@adonisjs/auth/session'
import type { InferAuthEvents, Authenticators } from '@adonisjs/auth/types'
import { configProvider } from '@adonisjs/core'

const authConfig = defineConfig({
  default: 'web',
  guards: {
    web: sessionGuard({
      useRememberMeTokens: false,
      provider: configProvider.create(async () => {
        const { SessionKyselyUserProvider } = await import(
          '../app/auth_providers/session_user_provider.js'
        )
        return new SessionKyselyUserProvider()
      }),
    }),
    api: tokensGuard({
      provider: configProvider.create(async () => {
        const { AccessTokenKyselyUserProvider } = await import(
          '../app/auth_providers/access_token_user_provider.js'
        )
        return new AccessTokenKyselyUserProvider()
      }),
    }),
  },
})

export default authConfig

/**
 * Inferring types from the configured auth
 * guards.
 */
declare module '@adonisjs/auth/types' {
  interface Authenticators extends InferAuthenticators<typeof authConfig> {}
}
declare module '@adonisjs/core/types' {
  interface EventsList extends InferAuthEvents<Authenticators> {}
}
