import * as path from 'node:path'
import { db } from '#services/db'
import * as fs from 'node:fs/promises'
import { BaseCommand } from '@adonisjs/core/ace'
import { FileMigrationProvider, Migrator } from 'kysely'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { databaseConfig } from '#config/database'
import { Cli as kyselyCodegenCli } from 'kysely-codegen/dist/cli/cli.js'
import env from '#start/env'
import { default as PG } from 'pg'

export default class KyselyRollback extends BaseCommand {
  static commandName = 'db:rollback'
  static description = 'Rollback the database by running down method on the migration files'
  static options: CommandOptions = {
    startApp: true,
  }

  declare migrator: Migrator

  /**
   * Prepare lifecycle hook runs before the "run" method
   * and hence, we use it to prepare the migrator
   * instance
   */
  async prepare() {
    this.migrator = new Migrator({
      db: db(),
      provider: new FileMigrationProvider({
        fs,
        path,
        migrationFolder: this.app.migrationsPath(),
      }),
    })
  }

  /**
   * The complete lifecycle hook runs after the "run" method
   * and hence, we use it to close the data connection.
   */
  async completed() {
    await db().destroy()
  }

  /**
   * Runs migrations up method
   */
  async run() {
    const config = databaseConfig[env.get('NODE_ENV') as keyof typeof databaseConfig]()
    const client = new PG.Client(config)

    this.logger.info(`Rolling back ${client.database}`)

    const { error, results } = await this.migrator.migrateDown()

    /**
     * Print results
     */
    results?.forEach((it) => {
      switch (it.status) {
        case 'Success':
          this.logger.success(`migration "${it.migrationName}" rolled back successfully`)
          break
        case 'Error':
          this.logger.error(`failed to rollback migration "${it.migrationName}"`)
          break
        case 'NotExecuted':
          this.logger.info(`rollback pending "${it.migrationName}"`)
      }
    })

    /**
     * Display error
     */
    if (error) {
      this.logger.error('Failed to rollback')
      this.error = error
      this.exitCode = 1
    }

    /**
     * Update database types
     */
    this.logger.info('Updating database types with kysely-codegen')
    const url = `postgres://${client.user}:${client.password}@${client.host}:${client.port}/${client.database}`

    await new kyselyCodegenCli().generate({
      url,
      dialectName: 'postgres',
      outFile: this.app.makePath('database', 'types.d.ts'),
      camelCase: true,
    })
    this.logger.success('Database types updated')
  }
}
