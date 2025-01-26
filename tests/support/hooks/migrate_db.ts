import { db } from '#services/db'
import { FileMigrationProvider, Migrator } from 'kysely'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import app from '@adonisjs/core/services/app'

export default async function migrateDb() {
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
}
