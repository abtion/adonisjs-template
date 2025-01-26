import { BaseCommand, args } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import StringBuilder from '@poppinss/utils/string_builder'

export default class MakeMigration extends BaseCommand {
  static commandName = 'make:migration'
  static description = 'Create a new Kysely migration file'
  static options: CommandOptions = {}

  @args.string({ description: 'Name of the migration file' })
  declare name: string

  async run() {
    const entity = this.app.generators.createEntity(this.name)
    const name = new StringBuilder(entity.name).snakeCase().toString()
    const codemods = await this.createCodemods()
    const fileName = `${new Date().getTime()}_${name}.ts`

    if (entity.name.startsWith('create_')) {
      const tableName = this.app.generators.tableName(entity.name.replace(/^create_/, ''))
      await codemods.makeUsingStub(this.app.commandsPath('stubs'), 'make/create_migration.stub', {
        entity,
        migration: {
          tableName,
          fileName,
        },
      })
    } else {
      await codemods.makeUsingStub(this.app.commandsPath('stubs'), 'make/migration.stub', {
        entity,
        migration: {
          entity,
          fileName,
        },
      })
    }
  }
}
