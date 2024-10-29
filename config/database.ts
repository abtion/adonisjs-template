import env from '#start/env'
import PG from 'pg'

const requireEnvVar = (key: string) => {
  const value = env.get(key)
  if (!value) throw new Error(`${key} required for ${env.get('NODE_ENV')}`)
  return value
}

// const type = Record<>
export const databaseConfig = {
  production: (): PG.ClientConfig => {
    return {
      connectionString: requireEnvVar('DATABASE_URL'),
    }
  },
  development: (): PG.ClientConfig => {
    const url = new URL(requireEnvVar('DATABASE_SERVER'))
    return {
      host: url.hostname,
      port: Number.parseInt(url.port),
      user: url.username,
      password: url.password,
      database: `project_name_snake_development`,
    }
  },
  test: (): PG.ClientConfig => {
    const url = new URL(requireEnvVar('DATABASE_SERVER'))
    return {
      host: url.hostname,
      port: Number.parseInt(url.port),
      user: url.username,
      password: url.password,
      database: `project_name_snake_test`,
    }
  },
}
