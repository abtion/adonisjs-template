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

    const { otp } = await request.validateUsing(verifyOtpValidator)

    const user = await loadUserWithTwoFactor(auth.user.id)

    const userSecret = parseTwoFactorSecret(user.twoFactorSecret)

    const secret = userSecret?.secret
    const recoveryCodes = user.twoFactorRecoveryCodes

    if (!secret) {
      return response.badRequest({
        message: i18n.formatMessage('errors.twoFactorSecretNotGenerated'),
      })
    }

    const isValid = twoFactorAuth.verifyToken(secret, otp, recoveryCodes)

    if (!isValid) {
      return response.badRequest({ message: i18n.formatMessage('errors.otpInvalid') })
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
