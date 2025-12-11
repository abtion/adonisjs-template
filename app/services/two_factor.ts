import { db } from '#services/db'
import type { HttpContext } from '@adonisjs/core/http'
import { Selectable } from 'kysely'
import type { Users } from '#database/types'
import type { AuthenticatorTransport } from '@simplewebauthn/types'

type SessionStore = HttpContext['session']

/**
 * Valid AuthenticatorTransport values according to WebAuthn specification
 */
const VALID_TRANSPORTS: readonly AuthenticatorTransport[] = [
  'usb',
  'nfc',
  'ble',
  'hybrid',
  'internal',
] as const

/**
 * Type guard to check if a value is a valid AuthenticatorTransport
 */
function isValidTransport(value: unknown): value is AuthenticatorTransport {
  return typeof value === 'string' && VALID_TRANSPORTS.includes(value as AuthenticatorTransport)
}

/**
 * Safely parse and validate transports from database (JSONB) to AuthenticatorTransport[]
 * Returns an empty array if the value is invalid, null, or undefined
 */
export function parseTransports(transports: unknown): AuthenticatorTransport[] {
  if (!transports) {
    return []
  }

  if (!Array.isArray(transports)) {
    return []
  }

  return transports.filter(isValidTransport)
}

export const TWO_FACTOR_SESSION_KEY = 'twoFactorPassed'
export const WEBAUTHN_REG_CHALLENGE_KEY = 'webauthnRegistrationChallenge'
export const WEBAUTHN_AUTH_CHALLENGE_KEY = 'webauthnAuthenticationChallenge'
export const SECURITY_CONFIRMATION_KEY = 'securityConfirmation'
export const SECURITY_CONFIRMATION_CHALLENGE_KEY = 'securityConfirmationChallenge'

export const markTwoFactorPassed = (session: SessionStore) => {
  session.put(TWO_FACTOR_SESSION_KEY, true)
}

export const isTwoFactorPassed = (session: SessionStore) => {
  return session.get(TWO_FACTOR_SESSION_KEY, false)
}

export const resetTwoFactorSession = (session: SessionStore) => {
  session.forget(TWO_FACTOR_SESSION_KEY)
  session.forget(WEBAUTHN_REG_CHALLENGE_KEY)
  session.forget(WEBAUTHN_AUTH_CHALLENGE_KEY)
}

export const markSecurityConfirmed = (session: SessionStore) => {
  session.put(SECURITY_CONFIRMATION_KEY, true)
}

export const isSecurityConfirmed = (session: SessionStore) => {
  return session.get(SECURITY_CONFIRMATION_KEY, false)
}

export const resetSecurityConfirmation = (session: SessionStore) => {
  session.forget(SECURITY_CONFIRMATION_KEY)
  session.forget(SECURITY_CONFIRMATION_CHALLENGE_KEY)
}

export async function loadUserWithTwoFactor(userId: number): Promise<Selectable<Users>> {
  const user = await db()
    .selectFrom('users')
    .selectAll()
    .where('users.id', '=', userId)
    .executeTakeFirst()

  if (!user) {
    throw new Error('User not found')
  }

  return user
}

export async function userHasWebauthnCredentials(userId: number): Promise<boolean> {
  const credential = await db()
    .selectFrom('webauthnCredentials')
    .select(['id'])
    .where('webauthnCredentials.userId', '=', userId)
    .executeTakeFirst()

  return Boolean(credential)
}

export async function getUserAuthInfo(email: string) {
  const user = await db()
    .selectFrom('users')
    .selectAll()
    .where('users.email', '=', email)
    .executeTakeFirst()

  if (!user) {
    return null
  }

  const hasPasskeys = await userHasWebauthnCredentials(user.id)
  const requiresOtp = user.isTwoFactorEnabled

  return {
    hasPasskeys,
    requiresOtp,
    userId: user.id,
  }
}

export const requiresTwoFactor = async (_userId: number, isTwoFactorEnabled: boolean) => {
  // Only OTP requires 2FA challenge - passkeys are handled separately
  return isTwoFactorEnabled
}

/**
 * Parse recovery codes from database (JSONB) to string array
 * Handles various formats: array, JSON string, or invalid values
 */
export function parseRecoveryCodes(codes: unknown): string[] {
  if (Array.isArray(codes)) return codes as string[]
  if (typeof codes === 'string') {
    try {
      return JSON.parse(codes)
    } catch {
      return []
    }
  }
  return []
}
