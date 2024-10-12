import { DB } from '#database/types'
import hash from '@adonisjs/core/services/hash'
import { Kysely } from 'kysely'

export default async function (db: Kysely<DB>) {
  const timestamps = { createdAt: new Date(), updatedAt: new Date() }

  await db
    .insertInto('users')
    .values([
      {
        fullName: 'John Doe',
        email: 'admin@example.com',
        password: await hash.make('password'),
        ...timestamps,
      },
    ])
    .execute()
}
