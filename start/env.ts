/*
|--------------------------------------------------------------------------
| Environment variables service
|--------------------------------------------------------------------------
|
| The `Env.create` method creates an instance of the Env service. The
| service validates the environment variables and also cast values
| to JavaScript data types.
|
*/

import { Env } from '@adonisjs/core/env'

export const schema = {
  NODE_ENV: Env.schema.enum.optional(['development', 'production', 'test'] as const),
  APP_KEY: Env.schema.string(),
  HOST: Env.schema.string.optional({ format: 'host' }),
  PORT: Env.schema.number.optional(),
  LOG_LEVEL: Env.schema.string.optional(),

  /*
  |----------------------------------------------------------
  | Variables for configuring session package
  |----------------------------------------------------------
  */
  SESSION_DRIVER: Env.schema.enum.optional(['cookie', 'memory'] as const),

  /*
  |----------------------------------------------------------
  | Variables for configuring database connection
  |----------------------------------------------------------
  */
  DATABASE_SERVER: Env.schema.string.optional(), // Used for development and test
  DATABASE_URL: Env.schema.string.optional(), // Used for production env
}

const env =
  process.env.NODE_ENV === 'production'
    ? new Env(Env.rules(schema).validate(process.env))
    : await Env.create(new URL('../', import.meta.url), schema) // Only load .env-files when not production

export default env
