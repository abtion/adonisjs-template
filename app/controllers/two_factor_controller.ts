import twoFactorAuth from '@nulix/adonis-2fa/services/main'
import type { HttpContext } from '@adonisjs/core/http'

import { db } from '#services/db'
import {
  isTwoFactorPassed,
  loadUserWithTwoFactor,
  markTwoFactorPassed,
  resetTwoFactorSession,
  isSecurityConfirmed,
  parseTwoFactorSecret,
  generateAndStoreTwoFactorSecret,
  checkTwoFactorRateLimit,
  recordTwoFactorAttempt,
  clearTwoFactorAttempts,
} from '#services/two_factor'
import { verifyOtpValidator } from '#validators/verify_otp'
import { sql } from 'kysely'

export default class TwoFactorController {
  async challenge({ auth, session, inertia, response }: HttpContext) {
    if (!auth.user) {
      return response.redirect('/sign-in')
    }

    const user = await loadUserWithTwoFactor(auth.user.id)
    const needsTwoFactor = user.isTwoFactorEnabled

    const recoveryCodes = user.twoFactorRecoveryCodes

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

  async generate({ auth, response, session, i18n }: HttpContext) {
    const user = await loadUserWithTwoFactor(auth.user!.id)

    if (!isSecurityConfirmed(session)) {
      return response.unauthorized({
        message: i18n.formatMessage('errors.securityConfirmationRequired'),
      })
    }

    if (user.isTwoFactorEnabled && !isTwoFactorPassed(session)) {
      return response.unauthorized({
        message: i18n.formatMessage('errors.twoFactorRequiredModifySettings'),
      })
    }

    const { secret, recoveryCodes } = await generateAndStoreTwoFactorSecret(user.id, user.email)

    return response.ok({ secret, recoveryCodes })
  }

  async verify({ auth, request, response, session, i18n }: HttpContext) {
    if (!auth.user) {
      return response.unauthorized({ message: i18n.formatMessage('errors.unauthorized') })
    }

    // Check rate limiting
    const rateLimitRemaining = checkTwoFactorRateLimit(session)
    if (rateLimitRemaining !== null) {
      const minutes = Math.ceil(rateLimitRemaining / 60000)
      return response.status(429).json({
        message: i18n.formatMessage('errors.rateLimitExceeded', { minutes }),
      })
    }

    const { otp } = await request.validateUsing(verifyOtpValidator)

    // Basic format validation
    if (!otp || typeof otp !== 'string' || otp.trim().length === 0) {
      return response.badRequest({
        message: i18n.formatMessage('errors.otpInvalidFormat'),
      })
    }

    const user = await loadUserWithTwoFactor(auth.user.id)

    const userSecret = parseTwoFactorSecret(user.twoFactorSecret)

    const secret = userSecret?.secret
    const recoveryCodes = user.twoFactorRecoveryCodes

    if (!secret) {
      return response.badRequest({
        message: i18n.formatMessage('errors.twoFactorSecretNotGenerated'),
      })
    }

    // Check if it's a recovery code
    const isRecoveryCode = recoveryCodes.includes(otp.trim())

    // Verify the code
    const isValid = isRecoveryCode
      ? true // Recovery code is already checked above
      : twoFactorAuth.verifyToken(secret, otp.trim(), recoveryCodes)

    if (!isValid) {
      // Record failed attempt
      const newRateLimitRemaining = recordTwoFactorAttempt(session)

      if (newRateLimitRemaining !== null) {
        const minutes = Math.ceil(newRateLimitRemaining / 60000)
        return response.status(429).json({
          message: i18n.formatMessage('errors.rateLimitExceeded', { minutes }),
        })
      }

      // Determine specific error message
      let errorMessage = i18n.formatMessage('errors.otpInvalid')

      if (isRecoveryCode) {
        errorMessage = i18n.formatMessage('errors.recoveryCodeInvalid')
      } else if (!/^\d{6}$/.test(otp.trim())) {
        errorMessage = i18n.formatMessage('errors.otpInvalidFormat')
      }

      return response.badRequest({ message: errorMessage })
    }

    // Success - clear rate limiting and update recovery codes if used
    clearTwoFactorAttempts(session)
    const updatedRecoveryCodes = recoveryCodes.filter((code) => code !== otp.trim())

    await db()
      .updateTable('users')
      .set({
        isTwoFactorEnabled: true,
        twoFactorRecoveryCodes: sql`cast(${JSON.stringify(updatedRecoveryCodes)} as jsonb)`,
      })
      .where('users.id', '=', user.id)
      .execute()

    markTwoFactorPassed(session)

    return response.ok({ message: i18n.formatMessage('errors.otpValid') })
  }

  async generateRecoveryCodes({ auth, response, session, i18n }: HttpContext) {
    if (!auth.user) {
      return response.unauthorized({ message: i18n.formatMessage('errors.unauthorized') })
    }

    if (!auth.user.isTwoFactorEnabled) {
      return response.badRequest({ message: i18n.formatMessage('errors.userWithout2FAActive') })
    }

    if (!isSecurityConfirmed(session)) {
      return response.unauthorized({
        message: i18n.formatMessage('errors.securityConfirmationRequired'),
      })
    }

    if (!isTwoFactorPassed(session)) {
      return response.unauthorized({
        message: i18n.formatMessage('errors.twoFactorRequiredRotateRecoveryCodes'),
      })
    }

    const recoveryCodes = twoFactorAuth.generateRecoveryCodes()

    await db()
      .updateTable('users')
      .set({ twoFactorRecoveryCodes: sql`cast(${JSON.stringify(recoveryCodes)} as jsonb)` })
      .where('users.id', '=', auth.user.id)
      .execute()

    return { recoveryCodes }
  }

  async disable({ auth, response, session, i18n }: HttpContext) {
    if (!auth.user) {
      return response.unauthorized({ message: i18n.formatMessage('errors.unauthorized') })
    }

    if (!auth.user.isTwoFactorEnabled) {
      return response.badRequest({ message: i18n.formatMessage('errors.userWithout2FAActive') })
    }

    if (!isSecurityConfirmed(session)) {
      return response.unauthorized({
        message: i18n.formatMessage('errors.securityConfirmationRequired'),
      })
    }

    if (!isTwoFactorPassed(session)) {
      return response.unauthorized({
        message: i18n.formatMessage('errors.twoFactorRequiredDisable'),
      })
    }

    await db()
      .updateTable('users')
      .set({
        isTwoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorRecoveryCodes: sql`cast('[]' as jsonb)`,
      })
      .where('users.id', '=', auth.user.id)
      .execute()

    resetTwoFactorSession(session)
    markTwoFactorPassed(session)

    return response.noContent()
  }
}
