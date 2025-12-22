import timestamps from '../timestamps.js'
import { InsertObject } from 'kysely'
import { DB } from '#database/types'
import { db } from '#services/db'

export async function getWebauthnCredentialAttributes(
  attributes: Partial<InsertObject<DB, 'webauthnCredentials'>> = {}
) {
  return {
    transports: ['usb'],
    friendlyName: 'Credential',
    ...timestamps(),
    ...attributes,
  }
}

export async function createWebauthnCredential(
  attributes: Partial<InsertObject<DB, 'webauthnCredentials'>> = {}
) {
  const values: any = await getWebauthnCredentialAttributes(attributes)

  return db()
    .insertInto('webauthnCredentials')
    .values([values])
    .returningAll()
    .executeTakeFirstOrThrow()
}
