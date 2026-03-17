import { createTuyau, TuyauHTTPError } from '@tuyau/client'
import type { ApiDefinition } from '../../.adonisjs/api'

const isSSR = typeof window === 'undefined'

export const tuyau = createTuyau<{ definition: ApiDefinition }>({
  baseUrl: isSSR ? '' : location.origin,
  headers: {
    accept: 'application/json',
  },
  plugins: [],
})

export const errorIsType = (err: unknown, name: string) => {
  if (!(err instanceof TuyauHTTPError)) return false

  const value = err.value as any
  return value?.name === name
}

export const getErrorMessage = (err: unknown, fallback: string) => {
  if (err instanceof TuyauHTTPError) {
    return (err.value as any)?.message ?? fallback
  }

  return err instanceof Error ? err.message : fallback
}
