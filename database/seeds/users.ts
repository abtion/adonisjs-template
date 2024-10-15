import { DB } from '#database/types'
import timestamps from '#tests/support/timestamps'
import { BaseCommand } from '@adonisjs/core/ace'
import hash from '@adonisjs/core/services/hash'
import { Kysely } from 'kysely'

export default async function (db: Kysely<DB>, logger: BaseCommand['logger']) {
  const { count } = await db
    .selectFrom('users')
    .select((qb) => qb.fn.countAll().as('count'))
    .executeTakeFirstOrThrow()

  if (Number(count) !== 0) {
    logger.info('Skipping user creation. Table is not empty')
    return
  }

  await db
    .insertInto('users')
    .values([
      {
        name: 'Admin Doe',
        email: 'admin@example.com',
        admin: true,
        password: await hash.make('password'),
        ...timestamps(),
      },
    ])
    .execute()

  await db
    .insertInto('users')
    .values([
      {
        name: 'User Doe',
        email: 'user@example.com',
        password: await hash.make('password'),
        ...timestamps(),
      },
    ])
    .execute()
}
