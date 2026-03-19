import hash from '@adonisjs/core/services/hash'
import timestamps from '../timestamps.js'
import { type InsertObject } from 'kysely'
import { type DB } from '#database/types'
import { db } from '#services/db'

export async function getUserAttributes(attributes: Partial<InsertObject<DB, 'users'>> = {}) {
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
  const values: any = await getUserAttributes(attributes)

  return db().insertInto('users').values([values]).returningAll().executeTakeFirstOrThrow()
}
