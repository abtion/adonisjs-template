import { Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('users')
    .addColumn('is_two_factor_enabled', 'boolean', (col) => col.notNull().defaultTo(false))
    .addColumn('two_factor_secret', 'jsonb')
    .addColumn('two_factor_recovery_codes', 'jsonb', (col) =>
      col.notNull().defaultTo(sql`'[]'::jsonb`)
    )
    .execute()

  await db.schema
    .createTable('webauthn_credentials')
    .addColumn('id', 'serial', (col) => col.primaryKey().notNull())
    .addColumn('user_id', 'integer', (col) =>
      col.notNull().references('users.id').onDelete('cascade')
    )
    .addColumn('credential_id', 'text', (col) => col.notNull().unique())
    .addColumn('public_key', 'text', (col) => col.notNull())
    .addColumn('counter', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('transports', 'jsonb', (col) => col.notNull().defaultTo(sql`'[]'::jsonb`))
    .addColumn('device_type', 'varchar')
    .addColumn('backed_up', 'boolean', (col) => col.notNull().defaultTo(false))
    .addColumn('friendly_name', 'varchar')
    .addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamp', (col) => col.notNull().defaultTo(sql`now()`))
    .execute()
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('webauthn_credentials').execute()

  await db.schema
    .alterTable('users')
    .dropColumn('is_two_factor_enabled')
    .dropColumn('two_factor_secret')
    .dropColumn('two_factor_recovery_codes')
    .execute()
}
