import { BaseCommand } from '@adonisjs/core/ace'
import PG from 'pg'
import { databaseConfig } from '#config/database'
import { CommandOptions } from '@adonisjs/core/types/ace'
import { spawn } from 'node:child_process'
import env from '#start/env'

export default class KyselyMigrate extends BaseCommand {
  static commandName = 'db:connect'
  static description = 'Connect to database using psql (requires psql)'
  static options: CommandOptions = {}

  declare client: PG.Client

  async prepare(..._: any[]) {}

  async completed() {}

  async run() {
    const connectionConfig = databaseConfig[env.get('NODE_ENV') as keyof typeof databaseConfig]()

    let { connectionString } = connectionConfig
    if (!connectionString) {
      const { user, password, host, port, database } = connectionConfig
      connectionString = [
        'postgres://',
        `${user}`,
        password && `:${password as string}`,
        `@${host}`,
        port && `:${port}`,
        `/${database}`,
      ]
        .filter(Boolean)
        .join('')
    }

    this.logger.info(`Connecting to ${connectionString}`)
    this.logger.info('To exit psql, type \\q and press Enter.')

    const psqlProcess = spawn('psql', [connectionString], {
      stdio: 'inherit', // Connects psql's stdio to the current process's stdio (tty mode)
      env: process.env,
    })

    await new Promise<void>((resolve, reject) => {
      psqlProcess.on('close', (code) => {
        if (code !== 0) {
          this.logger.error(`psql process exited with code ${code}`)
          this.exitCode = 1
          reject(new Error(`psql exited with code ${code}`))
        } else {
          this.logger.success('psql process exited successfully')
          resolve()
        }
      })
      psqlProcess.on('error', (err) => {
        this.logger.error(`Failed to start psql: ${err.message}`)
        this.exitCode = 1
        reject(err)
      })
    })
  }
}
