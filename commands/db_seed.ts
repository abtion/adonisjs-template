import { db } from '#services/db'
import { args, BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { databaseConfig } from '#config/database'
import env from '#start/env'
import { readdir } from 'fs/promises'
import { basename, join, resolve } from 'path'
import { existsSync } from 'fs'

export default class KyselyMigrate extends BaseCommand {
  static commandName = 'db:seed'
  static description = 'Seed the database'
  static options: CommandOptions = {
    startApp: true,
  }

  @args.spread({
    description: `
      Names of seeds to run - filenames in the seeds dir, excluding extension.
      Leave empty to run all seeds - child dirs are NOT included.
    `.trim(),
    required: false,
  })
  declare seedNames: string[]
  declare seedDir: string

  /**
   * Prepare lifecycle hook runs before the "run" method
   * and hence, we use it to prepare the migrator
   * instance
   */
  async prepare() {
    this.seedDir = this.app.makePath('database', 'seeds')

    if (!this.seedNames) {
      const seedDir = this.app.makePath('database', 'seeds')
      const seedFiles = await readdir(seedDir, { withFileTypes: true })
      this.seedNames = seedFiles.map((dirent) => join(seedDir, basename(dirent.name, '.ts')))
    }
  }

  /**
   * The complete lifecycle hook runs after the "run" method
   * and hence, we use it to close the data connection.
   */
  async completed() {
    await db().destroy()
  }

  /**
   * Run all seed files
   */
  async run() {
    this.logger.info(`Seeding ${databaseConfig[env.get('NODE_ENV')]().database}`)

    const dbInstance = db()
    const seedDefs: { name: string; fn: (db: typeof dbInstance) => PromiseLike<void> }[] = []

    try {
      for (let seedName of this.seedNames) {
        const filePath = resolve(this.seedDir, `${seedName}.ts`)

        if (!existsSync(filePath)) throw new Error(`Seed file not found ${filePath}`)
        const seedModule = await import(filePath)

        if (typeof seedModule.default !== 'function') {
          throw new Error(`Seed must have default export that is a function: ${basename(seedName)}`)
        }
        seedDefs.push({ name: seedName, fn: seedModule.default })
      }
    } catch (e) {
      this.logger.error(e.message)
    }

    for (let { name, fn } of seedDefs) {
      this.logger.info(`Executing seed ${name}`)
      await fn(dbInstance)
    }

    this.logger.success('Database seeded')
  }
}
