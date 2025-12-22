import hash from '@adonisjs/core/services/hash'
import timestamps from '../timestamps.js'
import { InsertObject, sql } from 'kysely'
import { DB } from '#database/types'
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

  // Explicitly handle isTwoFactorEnabled to ensure it's set correctly
  if (attributes.isTwoFactorEnabled !== undefined) {
    values.isTwoFactorEnabled = attributes.isTwoFactorEnabled
  }

  if (attributes.twoFactorSecret !== undefined) {
    const payload =
      typeof attributes.twoFactorSecret === 'string'
        ? attributes.twoFactorSecret
        : JSON.stringify(attributes.twoFactorSecret)

    values.twoFactorSecret = sql`cast(${payload} as jsonb)`
  }

  if (attributes.twoFactorRecoveryCodes !== undefined) {
    const payload = JSON.stringify(attributes.twoFactorRecoveryCodes ?? [])
    values.twoFactorRecoveryCodes = sql`cast(${payload} as jsonb)`
  }

  return db().insertInto('users').values([values]).returningAll().executeTakeFirstOrThrow()
}
