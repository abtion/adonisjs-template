import timestamps from '../timestamps.js'
import { InsertObject } from 'kysely'
import { DB } from '#database/types'
import { db } from '#services/db'

export function getWebauthnCredentialAttributes(
  attributes: Partial<InsertObject<DB, 'webauthnCredentials'>> = {}
): Partial<InsertObject<DB, 'webauthnCredentials'>> {
  return {
    credentialId: 'credential-id',
    transports: ['usb'],
    friendlyName: 'Credential',
    publicKey: 'public-key',
    ...timestamps(),
    ...attributes,
  }
}

export async function createWebauthnCredential(
  attributes: Partial<InsertObject<DB, 'webauthnCredentials'>> = {}
) {
  const values: any = getWebauthnCredentialAttributes(attributes)

  return db()
    .insertInto('webauthnCredentials')
    .values([values])
    .returningAll()
    .executeTakeFirstOrThrow()
}
