import { registry } from '@generated/registry'
import { createTuyau, TuyauHTTPError } from '@tuyau/core/client'

export const client = createTuyau({
  baseUrl: '/',
  registry,
})

export const urlFor = client.urlFor

export const errorIsType = (err: unknown, name: string) => {
  if (!(err instanceof TuyauHTTPError)) return false

  const value = err.response as any
  return value?.name === name
}

export const getErrorMessage = (err: unknown, fallback: string) => {
  if (err instanceof TuyauHTTPError) {
    return (err.response as any)?.message ?? fallback
  }

  return err instanceof Error ? err.message : fallback
}
