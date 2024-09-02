import env from '#start/env'
import { basename, join } from 'path'
import PG from 'pg'

type DatabaseConfig = Record<string, () => PG.ClientConfig>

const requireEnvVar = (key: string) => {
  const value = env.get(key)
  if (!value) throw new Error(`${key} required for ${env.get('NODE_ENV')}`)
  return value
}

const appFolderName = basename(join(import.meta.dirname, '..')).replace(/[^\w]+/, '_')

// const type = Record<>
export const databaseConfig: DatabaseConfig = {
  production: () => {
    return {
      connectionString: requireEnvVar('DATABASE_URL'),
    }
  },
  development: () => {
    const url = new URL(requireEnvVar('DATABASE_SERVER'))
    return {
      host: url.hostname,
      port: parseInt(url.port),
      user: url.username,
      password: url.password,
      database: `${appFolderName}_development`,
    }
  },
  test: () => {
    const url = new URL(requireEnvVar('DATABASE_SERVER'))
    return {
      host: url.hostname,
      port: parseInt(url.port),
      user: url.username,
      password: url.password,
      database: `${appFolderName}_test`,
    }
  },
}
