import { Kysely, PostgresDialect } from 'kysely'
import PG from 'pg'
import { DB } from 'kysely-codegen/dist/db.js'
import env from '#start/env'
import { databaseConfig } from '#config/database'

const dialect = new PostgresDialect({
  pool: new PG.Pool(databaseConfig[env.get('NODE_ENV')]()),
})

export const globalDb = new Kysely<DB>({
  dialect,
})

let globalTransaction: Kysely<DB> | null = null

export const db = () => {
  if (globalTransaction) return globalTransaction

  return globalDb
}

class Rollback extends Error {}

export const withGlobalTransaction = () => {
  let rollback: () => void
  return new Promise<() => void>((resolveCleanup) => {
    globalDb
      .transaction()
      .execute((transaction) => {
        globalTransaction = transaction

        return new Promise((_res, rej) => {
          rollback = () => {
            globalTransaction = null
            rej(new Rollback())
          }
          resolveCleanup(rollback)
        })
      })
      .catch((error) => {
        // console.log(error)
        if (!(error instanceof Rollback)) {
          throw error
        }
      })
  })
}
