import { BaseCommand } from '@adonisjs/core/ace'
import PG from 'pg'
import { databaseConfig } from '#config/database'
import { CommandOptions } from '@adonisjs/core/types/ace'

export default class KyselyMigrate extends BaseCommand {
  static commandName = 'db:drop'
  static description = 'Drop databases for environments: development, test'
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
      this.logger.info(`Dropping "${database}"`)

      try {
        await this.client.query(`DROP DATABASE "${database}"`)
        this.logger.success(`Dropped "${database}"`)
      } catch (error) {
        if (error?.code === '3D000') {
          this.logger.info(`Skipping "${database}: Database does not exist`)
        } else {
          throw error
        }
      }
    }
  }
}
