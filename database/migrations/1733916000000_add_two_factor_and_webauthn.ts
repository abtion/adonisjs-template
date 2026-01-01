import { Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('users')
    .addColumn('totp_enabled', 'boolean', (col) => col.notNull().defaultTo(false))
    .addColumn('totp_recovery_codes_encrypted', 'text')
    .addColumn('totp_secret_encrypted', 'text')
    .execute()

  await db.schema
    .createType('webauthn_transport')
    .asEnum(['ble', 'cable', 'hybrid', 'internal', 'nfc', 'smart-card', 'usb'])
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
    .addColumn('transports', sql`webauthn_transport[]`, (col) =>
      col.notNull().defaultTo(sql`'{}'::webauthn_transport[]`)
    )
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
    .dropColumn('totp_enabled')
    .dropColumn('totp_secret_encrypted')
    .dropColumn('totp_recovery_codes_encrypted')
    .execute()

  await db.schema.dropType('webauthn_transport').execute()
}
