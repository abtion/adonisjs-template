import twoFactorAuth from '@nulix/adonis-2fa/services/main'
import type { HttpContext } from '@adonisjs/core/http'

import { db } from '#services/db'
import {
  isTwoFactorPassed,
  loadUserWithTwoFactor,
  markTwoFactorPassed,
  resetTwoFactorSession,
} from '#services/two_factor'
import { verifyOtpValidator } from '#validators/verify_otp'
import { sql } from 'kysely'

const parseRecoveryCodes = (codes: unknown): string[] => {
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

export default class TwoFactorController {
  async challenge({ auth, session, inertia, response }: HttpContext) {
    const user = await loadUserWithTwoFactor(auth.user!.id)
    const needsTwoFactor = user.isTwoFactorEnabled

    const recoveryCodes = parseRecoveryCodes(user.twoFactorRecoveryCodes)

    if (!needsTwoFactor) {
      markTwoFactorPassed(session)
      return response.redirect('/')
    }

    return inertia.render('session/twoFactorChallenge', {
      methods: {
        totp: Boolean(user.twoFactorSecret),
        recovery: recoveryCodes.length > 0,
      },
    })
  }

  async generate({ auth, response, session }: HttpContext) {
    const user = await loadUserWithTwoFactor(auth.user!.id)

    if (user.isTwoFactorEnabled && !isTwoFactorPassed(session)) {
      return response.unauthorized({
        message: 'Two-factor authentication required to modify settings',
      })
    }

    const secret = await twoFactorAuth.generateSecret(user.email)

    await db()
      .updateTable('users')
      .set({
        twoFactorSecret: sql`cast(${JSON.stringify(secret)} as jsonb)`,
        isTwoFactorEnabled: false,
        twoFactorRecoveryCodes: sql`cast('[]' as jsonb)`,
      })
      .where('users.id', '=', user.id)
      .execute()

    return response.ok({ secret })
  }

  async verify({ auth, request, response, session }: HttpContext) {
    const { otp } = await request.validateUsing(verifyOtpValidator)

    const user = await loadUserWithTwoFactor(auth.user!.id)

    const userSecret =
      typeof user.twoFactorSecret === 'string'
        ? JSON.parse(user.twoFactorSecret)
        : user.twoFactorSecret

    const secret = userSecret?.secret
    const recoveryCodes = parseRecoveryCodes(user.twoFactorRecoveryCodes)

    if (!secret) {
      return response.badRequest({ message: 'Two-factor secret not generated' })
    }

    const isValid = twoFactorAuth.verifyToken(secret, otp, recoveryCodes)

    if (!isValid) {
      return response.badRequest({ message: 'OTP invalid' })
    }

    const updatedRecoveryCodes = recoveryCodes.filter((code) => code !== otp)

    await db()
      .updateTable('users')
      .set({
        isTwoFactorEnabled: true,
        twoFactorRecoveryCodes: sql`cast(${JSON.stringify(updatedRecoveryCodes)} as jsonb)`,
      })
      .where('users.id', '=', user.id)
      .execute()

    markTwoFactorPassed(session)

    return response.ok({ message: 'OTP valid' })
  }

  async generateRecoveryCodes({ auth, response, session }: HttpContext) {
    const user = await loadUserWithTwoFactor(auth.user!.id)

    if (!user.isTwoFactorEnabled) {
      return response.badRequest({ message: 'User without 2FA active' })
    }

    if (!isTwoFactorPassed(session)) {
      return response.unauthorized({
        message: 'Two-factor authentication required to rotate recovery codes',
      })
    }

    const recoveryCodes = twoFactorAuth.generateRecoveryCodes()

    await db()
      .updateTable('users')
      .set({ twoFactorRecoveryCodes: sql`cast(${JSON.stringify(recoveryCodes)} as jsonb)` })
      .where('users.id', '=', user.id)
      .execute()

    return { recoveryCodes }
  }

  async disable({ auth, response, session }: HttpContext) {
    const user = await loadUserWithTwoFactor(auth.user!.id)

    if (!user.isTwoFactorEnabled) {
      return response.badRequest({ message: 'User without 2FA active' })
    }

    if (!isTwoFactorPassed(session)) {
      return response.unauthorized({ message: 'Two-factor authentication required to disable' })
    }

    await db()
      .updateTable('users')
      .set({
        isTwoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorRecoveryCodes: sql`cast('[]' as jsonb)`,
      })
      .where('users.id', '=', user.id)
      .execute()

    resetTwoFactorSession(session)
    markTwoFactorPassed(session)

    return response.noContent()
  }
}
