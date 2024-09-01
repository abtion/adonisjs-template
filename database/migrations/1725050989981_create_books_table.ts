import { Kysely } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('books')
    .addColumn('id', 'serial', (col) => col.primaryKey().notNull())
    .addColumn('name', 'varchar', (col) => col.notNull())
    .addColumn('author_id', 'integer', (col) =>
      col.references('authors.id').onDelete('cascade').notNull()
    )
    .addColumn('created_at', 'timestamp', (col) => col.notNull())
    .addColumn('updated_at', 'timestamp', (col) => col.notNull())
    .execute()

  await db.schema.createIndex('books_author_id_index').on('books').column('author_id').execute()
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropIndex('books_author_id_index').execute()
  await db.schema.dropTable('books').execute()
}
