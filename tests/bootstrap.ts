import { assert } from '@japa/assert'
import app from '@adonisjs/core/services/app'
import type { Config } from '@japa/runner/types'
import { pluginAdonisJS } from '@japa/plugin-adonisjs'
import testUtils from '@adonisjs/core/services/test_utils'
import { browserClient } from '@japa/browser-client'
import { FileMigrationProvider, Migrator } from 'kysely'
import { db } from '#services/db'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
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
  browserClient({
    runInSuites: ['browser'],
  }),
]

/**
 * Configure lifecycle function to run before and after all the
 * tests.
 *
 * The setup functions are executed before all the tests
 * The teardown functions are executer after all the tests
 */
export const runnerHooks: Required<Pick<Config, 'setup' | 'teardown'>> = {
  setup: [],
  teardown: [],
}

/**
 * Configure suites by tapping into the test suite instance.
 * Learn more - https://japa.dev/docs/test-suites#lifecycle-hooks
 */
export const configureSuite: Config['configureSuite'] = (suite) => {
  suite.setup(async () => {
    const migrator = new Migrator({
      db: db(),
      provider: new FileMigrationProvider({
        fs,
        path,
        migrationFolder: app.migrationsPath(),
      }),
    })

    const migrations = await migrator.getMigrations()
    if (migrations.every((migration) => migration.executedAt)) {
      return
    }

    console.info('Schema not up-to-date, migrating')
    const { error } = await migrator.migrateToLatest()

    if (!error) {
      console.info('Schema migrated')
    } else {
      throw new Error(
        'Could not migrate test database. Please ensure that the database is running. To inspect errors, run: node ace db:migrate'
      )
    }
  })

  if (['browser', 'functional', 'e2e'].includes(suite.name)) {
    suite.setup(() => testUtils.httpServer().start())
  }
}
