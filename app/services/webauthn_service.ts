import env from '#start/env'

/**
 * WebAuthn service providing shared constants and utilities for WebAuthn operations
 */

const fallbackOrigin = `http://${env.get('HOST', 'localhost')}:${env.get('PORT', '3333')}`

/**
 * Get the WebAuthn relying party ID
 */
export function getRpId(): string {
  return env.get('WEBAUTHN_RP_ID', new URL(env.get('WEBAUTHN_ORIGIN', fallbackOrigin)).hostname)
}

/**
 * Get the WebAuthn origin
 */
export function getOrigin(): string {
  return env.get('WEBAUTHN_ORIGIN', fallbackOrigin)
}

/**
 * Get the WebAuthn relying party name
 */
export function getRpName(): string {
  return env.get('WEBAUTHN_RP_NAME', env.get('APP_ISSUER', 'Adonis'))
}

/**
 * Convert a base64url string to a Uint8Array
 * Returns Uint8Array as required by WebAuthn library
 * Creates a new ArrayBuffer to ensure proper type compatibility
 */
export function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const buffer = Buffer.from(value, 'base64url')
  // Create a new ArrayBuffer and copy the data to ensure type compatibility
  const arrayBuffer = new ArrayBuffer(buffer.length)
  const uint8Array = new Uint8Array(arrayBuffer)
  uint8Array.set(buffer)
  return uint8Array as Uint8Array<ArrayBuffer>
}

/**
 * Convert a Uint8Array, ArrayBuffer, or Buffer to a base64url string
 */
export function toBase64Url(
  value: Uint8Array | Uint8Array<ArrayBuffer> | ArrayBuffer | Buffer
): string {
  return Buffer.from(value instanceof ArrayBuffer ? new Uint8Array(value) : value).toString(
    'base64url'
  )
}
