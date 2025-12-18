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
  PENDING_USER_ID_KEY,
} from '#services/two_factor'
import { verifyOtpValidator } from '#validators/verify_otp'
import { sql } from 'kysely'

export default class TwoFactorController {
  async challenge({ auth, session, inertia, response }: HttpContext) {
    const pendingUserId = session.get(PENDING_USER_ID_KEY) as number | undefined
    const userId = pendingUserId || auth.user?.id

    if (!userId) {
      return response.redirect().toRoute('sign-in')
    }

    const user = await loadUserWithTwoFactor(userId)
    const needsTwoFactor = user.isTwoFactorEnabled

    const recoveryCodes = user.twoFactorRecoveryCodes

    if (!needsTwoFactor) {
      if (pendingUserId) {
        await auth.use('web').login(user)
        session.forget(PENDING_USER_ID_KEY)
      }
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
    const { otp } = await request.validateUsing(verifyOtpValidator)

    const pendingUserId = session.get(PENDING_USER_ID_KEY) as number | undefined
    const userId = pendingUserId || auth.user?.id

    if (!userId) {
      return response.unauthorized({ message: i18n.formatMessage('errors.unauthorized') })
    }

    const user = await loadUserWithTwoFactor(userId)

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

    if (pendingUserId) {
      await auth.use('web').login(user)
      session.forget(PENDING_USER_ID_KEY)
    }

    markTwoFactorPassed(session)

    return response.ok({ message: i18n.formatMessage('errors.otpValid') })
  }

  async generateRecoveryCodes({ auth, response, session, i18n }: HttpContext) {
    const user = await loadUserWithTwoFactor(auth.user!.id)

    if (!user.isTwoFactorEnabled) {
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
      .where('users.id', '=', user.id)
      .execute()

    return { recoveryCodes }
  }

  async disable({ auth, response, session, i18n }: HttpContext) {
    const user = await loadUserWithTwoFactor(auth.user!.id)

    if (!user.isTwoFactorEnabled) {
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
      .where('users.id', '=', user.id)
      .execute()

    resetTwoFactorSession(session)
    markTwoFactorPassed(session)

    return response.noContent()
  }
}
