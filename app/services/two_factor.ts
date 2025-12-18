import { db } from '#services/db'
import type { HttpContext } from '@adonisjs/core/http'
import { Selectable } from 'kysely'
import type { Users } from '#database/types'
import type { AuthenticatorTransport } from '@simplewebauthn/types'
import twoFactorAuth from '@nulix/adonis-2fa/services/main'
import { sql } from 'kysely'

export type UserWithTwoFactor = Omit<Selectable<Users>, 'twoFactorRecoveryCodes'> & {
  twoFactorRecoveryCodes: string[]
}

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

export type TwoFactorSecret = {
  secret?: string
  uri?: string
  qr?: string
}

export function parseTwoFactorSecret(value: unknown): TwoFactorSecret | null {
  let parsed: unknown

  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value)
    } catch {
      return null
    }
  } else {
    parsed = value
  }

  if (parsed && typeof parsed === 'object') {
    return parsed as TwoFactorSecret
  }

  return null
}

export const TWO_FACTOR_SESSION_KEY = 'twoFactorPassed'
export const PENDING_USER_ID_KEY = 'pendingUserId'
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
  session.forget(PENDING_USER_ID_KEY)
  session.forget(WEBAUTHN_REG_CHALLENGE_KEY)
  session.forget(WEBAUTHN_AUTH_CHALLENGE_KEY)
}

/**
 * Security confirmation timeout in milliseconds (5 minutes)
 */
const SECURITY_CONFIRMATION_TIMEOUT_MS = 5 * 60 * 1000

/**
 * Mark security as confirmed by storing the current timestamp
 */
export const markSecurityConfirmed = (session: SessionStore) => {
  session.put(SECURITY_CONFIRMATION_KEY, Date.now())
}

/**
 * Check if security was confirmed within the last 5 minutes
 * Returns false if confirmation is missing, expired, or invalid
 */
export const isSecurityConfirmed = (session: SessionStore): boolean => {
  const confirmationValue = session.get(SECURITY_CONFIRMATION_KEY)

  if (typeof confirmationValue !== 'number') {
    return false
  }

  const now = Date.now()
  const timeSinceConfirmation = now - confirmationValue

  return timeSinceConfirmation >= 0 && timeSinceConfirmation <= SECURITY_CONFIRMATION_TIMEOUT_MS
}

export const resetSecurityConfirmation = (session: SessionStore) => {
  session.forget(SECURITY_CONFIRMATION_KEY)
  session.forget(SECURITY_CONFIRMATION_CHALLENGE_KEY)
}

export async function loadUserWithTwoFactor(userId: number): Promise<UserWithTwoFactor> {
  const user = await db()
    .selectFrom('users')
    .selectAll()
    .where('users.id', '=', userId)
    .executeTakeFirst()

  if (!user) {
    throw new Error('User not found')
  }

  return {
    ...user,
    twoFactorRecoveryCodes: (user.twoFactorRecoveryCodes as string[]) || [],
  }
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

  const credential = await db()
    .selectFrom('webauthnCredentials')
    .select(['id'])
    .where('webauthnCredentials.userId', '=', user.id)
    .executeTakeFirst()

  const hasPasskeys = Boolean(credential)
  const requiresOtp = user.isTwoFactorEnabled

  return {
    hasPasskeys,
    requiresOtp,
    userId: user.id,
  }
}

/**
 * Generate and store TOTP secret and recovery codes for a user
 * This is shared logic used by both TwoFactorController.generate and ProfileController.enable
 */
export async function generateAndStoreTwoFactorSecret(
  userId: number,
  userEmail: string
): Promise<{ secret: TwoFactorSecret; recoveryCodes: string[] }> {
  const secret = await twoFactorAuth.generateSecret(userEmail)
  const recoveryCodes = twoFactorAuth.generateRecoveryCodes()

  await db()
    .updateTable('users')
    .set({
      twoFactorSecret: sql`cast(${JSON.stringify(secret)} as jsonb)`,
      isTwoFactorEnabled: false,
      twoFactorRecoveryCodes: sql`cast(${JSON.stringify(recoveryCodes)} as jsonb)`,
    })
    .where('users.id', '=', userId)
    .execute()

  return { secret, recoveryCodes }
}
