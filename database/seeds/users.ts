import { DB } from '#database/types'
import { BaseCommand } from '@adonisjs/core/ace'
import hash from '@adonisjs/core/services/hash'
import { Kysely } from 'kysely'

export default async function (db: Kysely<DB>, logger: BaseCommand['logger']) {
  const timestamps = { createdAt: new Date(), updatedAt: new Date() }

  const { count } = await db
    .selectFrom('users')
    .select((qb) => qb.fn.countAll().as('count'))
    .executeTakeFirstOrThrow()

  if (count !== 0) {
    logger.info('Skipping user creation. Table is not empty')
    return
  }

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
