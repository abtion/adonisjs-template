import hash from '@adonisjs/core/services/hash'
import timestamps from '../timestamps.js'
import { InsertObject } from 'kysely'
import { DB } from '#database/types'
import { db } from '#services/db'

export async function getUserAttributes(
  attributes: Partial<InsertObject<DB, 'users'>>
): Promise<InsertObject<DB, 'users'>> {
  return {
    name: 'John Doe',
    admin: true,
    email: 'admin@example.com',
    password: await hash.make('password'),
    ...timestamps(),
    ...attributes,
  }
}

export async function createUser(attributes: Partial<InsertObject<DB, 'users'>> = {}) {
  return db()
    .insertInto('users')
    .values([await getUserAttributes(attributes)])
    .returningAll()
    .executeTakeFirstOrThrow()
}
