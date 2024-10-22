import { assert } from '@japa/assert'
import app from '@adonisjs/core/services/app'
import type { Config } from '@japa/runner/types'
import { pluginAdonisJS } from '@japa/plugin-adonisjs'
import { apiClient } from '@japa/api-client'
import { inertiaApiClient } from '@adonisjs/inertia/plugins/api_client'
import testUtils from '@adonisjs/core/services/test_utils'
import { browserClient } from '@japa/browser-client'
import { authBrowserClient } from '@adonisjs/auth/plugins/browser_client'
import { sessionBrowserClient } from '@adonisjs/session/plugins/browser_client'
import { sessionApiClient } from '@adonisjs/session/plugins/api_client'
import { authApiClient } from '@adonisjs/auth/plugins/api_client'
import { db } from '#services/db'
import migrateDb from './support/hooks/migrateDb.js'
import collectBrowserCoverage from './support/plugins/collectBrowserCoverage.js'

/**
 * This file is imported by the "bin/test.ts" entrypoint file
 */

/**
 * Configure Japa plugins in the plugins array.
 * Learn more - https://japa.dev/docs/runner-config#plugins-optional
 */
export const plugins: Config['plugins'] = [
  assert(),
  pluginAdonisJS(app),

  // Functional tests
  apiClient(),
  sessionApiClient(app),
  authApiClient(app),
  inertiaApiClient(app),

  // Browser test
  browserClient({
    runInSuites: ['browser'],
  }),
  sessionBrowserClient(app),
  authBrowserClient(app),

  // Enable browser coverage collection if NYC_COVERAGE is set
  ...(process.env.NYC_COVERAGE
    ? [
        collectBrowserCoverage(app, {
          runInSuites: ['browser'],
        }),
      ]
    : []),
]

/**
 * Configure lifecycle function to run before and after all the
 * tests.
 *
 * The setup functions are executed before all the tests
 * The teardown functions are executer after all the tests
 */
export const runnerHooks: Required<Pick<Config, 'setup' | 'teardown'>> = {
  setup: [migrateDb],
  teardown: [
    // Close db connection so the test process will exit immediately after finishing the tests
    async () => await db().destroy(),
  ],
}

/**
 * Configure suites by tapping into the test suite instance.
 * Learn more - https://japa.dev/docs/test-suites#lifecycle-hooks
 */
export const configureSuite: Config['configureSuite'] = (suite) => {
  if (['browser', 'functional', 'e2e'].includes(suite.name)) {
    suite.setup(() => testUtils.httpServer().start())
  }
}
