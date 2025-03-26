import { CamelCasePlugin, Kysely, PostgresDialect, sql } from 'kysely'
import PG from 'pg'
import { DB } from '#database/types'
import env from '#start/env'
import { databaseConfig } from '#config/database'

const dialect = new PostgresDialect({
  pool: new PG.Pool(databaseConfig[env.get('NODE_ENV') as keyof typeof databaseConfig]()),
})

export const globalDb = new Kysely<DB>({
  dialect,
  plugins: [new CamelCasePlugin()],
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
        globalTransaction = new Proxy(transaction, {
          get: (target, prop) => {
            // To prevent transactions in source code from failing,
            // emulate transaction functionality with save points.
            //
            // Based on this example:
            // https://github.com/kysely-org/kysely/issues/255#issuecomment-1616684003
            /* v8 ignore start */
            if (prop === 'transaction') {
              return () => ({
                execute: async (cb: (kyselyTx: Kysely<DB>) => Promise<Kysely<DB>>) => {
                  await sql`SAVEPOINT test;`.execute(transaction)

                  return cb(transaction).catch(async () => {
                    // on explicit reject, rollback to savepoint
                    sql`ROLLBACK TO SAVEPOINT test;`.execute(transaction)
                  })
                },
              })
            }
            /* v8 ignore end */

            // @ts-expect-error Property access, keys not inferred
            const attr = target[prop]
            return typeof attr === 'function' ? attr.bind(target) : attr
          },
        })

        return new Promise((_res, rej) => {
          rollback = () => {
            globalTransaction = null
            rej(new Rollback())
          }
          resolveCleanup(rollback)
        })
      })
      .catch((error) => {
        /* v8 ignore start */
        if (!(error instanceof Rollback)) {
          throw error
        }
        /* v8 ignore end */
      })
  })
}
