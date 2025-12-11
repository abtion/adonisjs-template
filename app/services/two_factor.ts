import { db } from '#services/db'
import type { HttpContext } from '@adonisjs/core/http'
import { Selectable } from 'kysely'
import type { Users } from '#database/types'

type SessionStore = HttpContext['session']

export const TWO_FACTOR_SESSION_KEY = 'twoFactorPassed'
export const WEBAUTHN_REG_CHALLENGE_KEY = 'webauthnRegistrationChallenge'
export const WEBAUTHN_AUTH_CHALLENGE_KEY = 'webauthnAuthenticationChallenge'

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

export async function userHasWebauthnCredentialsByEmail(email: string): Promise<boolean> {
  const credential = await db()
    .selectFrom('webauthnCredentials')
    .innerJoin('users', 'users.id', 'webauthnCredentials.userId')
    .select(['webauthnCredentials.id'])
    .where('users.email', '=', email)
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
