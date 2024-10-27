import { BaseCommand } from '@adonisjs/core/ace'
import PG from 'pg'
import { databaseConfig } from '#config/database'
import { CommandOptions } from '@adonisjs/core/types/ace'

export default class KyselyMigrate extends BaseCommand {
  static commandName = 'db:create'
  static description = 'Create databases for environments: development, test'
  static options: CommandOptions = {}

  declare client: PG.Client

  async prepare(..._: any[]) {
    this.client = new PG.Client({
      ...databaseConfig['development'](),
      database: 'postgres',
    })
    await this.client.connect()
  }

  async completed() {
    await this.client.end()
  }

  async run() {
    for (const env of ['development', 'test'] as const) {
      const { database } = databaseConfig[env]()
      this.logger.info(`Creating "${database}"`)

      try {
        await this.client.query(`CREATE DATABASE "${database}"`)
        this.logger.success(`Created "${database}"`)
      } catch (error) {
        if (error?.code === '42P04') {
          this.logger.info(`Skipped "${database}": Database already exists`)
        } else {
          throw error
        }
      }
    }
  }
}
