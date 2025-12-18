import { db } from '#services/db'
import { createSessionValidator } from '#validators/session_validator'
import hash from '@adonisjs/core/services/hash'
import { setTimeout } from 'node:timers/promises'
import { errors } from '@adonisjs/auth'
import type { HttpContext } from '@adonisjs/core/http'
import {
  markTwoFactorPassed,
  resetTwoFactorSession,
  getUserAuthInfo,
  resetSecurityConfirmation,
  parseTransports,
} from '#services/two_factor'
import { getRpId, getOrigin, fromBase64Url } from '#services/webauthn_service'
import { webauthnServer } from '#services/webauthn_server'
import type { AuthenticationResponseJSON } from '@simplewebauthn/types'

export default class SessionController {
  /**
   * Sign-in form
   */
  async show({ inertia }: HttpContext) {
    return inertia.render('session/signIn', {
      step: 'email',
    })
  }

  /**
   * Check email and return auth info
   * Always returns the same structure to prevent user enumeration attacks
   */
  async checkEmail({ request, response, i18n }: HttpContext) {
    const email = request.input('email') as string | undefined

    if (!email) {
      return response.badRequest({ message: i18n.formatMessage('errors.emailRequired') })
    }

    const authInfo = await getUserAuthInfo(email)

    return response.ok({
      hasPasskeys: authInfo?.hasPasskeys || false,
      requiresOtp: authInfo?.requiresOtp || false,
    })
  }

  /**
   * Sign in
   */
  async store({ response, request, auth, session }: HttpContext) {
    const data = await request.validateUsing(createSessionValidator)

    const findAndVerifyUser = async () => {
      const user = await db()
        .selectFrom('users')
        .selectAll()
        .where('users.email', '=', data.email)
        .executeTakeFirst()
      if (!user) return null

      const isPasswordValid = await hash.verify(user.password, data.password)
      return isPasswordValid ? user : null
    }

    const [verifiedUser] = await Promise.all([findAndVerifyUser(), setTimeout(50)])

    if (!verifiedUser) throw new errors.E_INVALID_CREDENTIALS('invalidCredentials')

    const needsTwoFactor = verifiedUser.isTwoFactorEnabled

    if (needsTwoFactor) {
      session.put('pendingUserId', verifiedUser.id)
      return response.redirect().toRoute('2fa.challenge')
    }

    await auth.use('web').login(verifiedUser)
    markTwoFactorPassed(session)
    return response.redirect('/')
  }

  /**
   * Passwordless WebAuthn authentication options for a specific email
   */
  async passwordlessOptions({ request, session, response, i18n }: HttpContext) {
    const email = request.input('email') as string | undefined

    if (!email) {
      return response.badRequest({ message: i18n.formatMessage('errors.emailRequired') })
    }

    const user = await db()
      .selectFrom('users')
      .selectAll()
      .where('users.email', '=', email)
      .executeTakeFirst()

    const credentials = user
      ? await db()
          .selectFrom('webauthnCredentials')
          .selectAll()
          .where('webauthnCredentials.userId', '=', user.id)
          .execute()
      : []

    const allowCredentials = credentials.map((credential) => ({
      id: credential.credentialId,
      type: 'public-key' as const,
      transports: parseTransports(credential.transports),
    }))

    const options = await webauthnServer.generateAuthenticationOptions({
      rpID: getRpId(),
      userVerification: 'preferred',
      allowCredentials,
    })

    session.put('passwordlessChallenge', options.challenge)
    session.put('passwordlessEmail', email)

    return response.ok({ options })
  }

  /**
   * Verify passwordless WebAuthn authentication and log in
   */
  async passwordlessVerify({ request, response, auth, session, i18n }: HttpContext) {
    const assertion = request.input('assertion') as AuthenticationResponseJSON | undefined
    const expectedChallenge = session.get('passwordlessChallenge') as string | undefined

    if (!assertion || !expectedChallenge) {
      return response.badRequest({
        message: i18n.formatMessage('errors.missingAuthenticationPayload'),
      })
    }

    const credential = await db()
      .selectFrom('webauthnCredentials')
      .selectAll()
      .where('webauthnCredentials.credentialId', '=', assertion.id)
      .executeTakeFirst()

    if (!credential) {
      return response.badRequest({ message: i18n.formatMessage('errors.credentialNotFound') })
    }

    const verification = await webauthnServer.verifyAuthenticationResponse({
      response: assertion,
      expectedChallenge,
      expectedOrigin: getOrigin(),
      expectedRPID: getRpId(),
      credential: {
        id: credential.credentialId,
        publicKey: fromBase64Url(credential.publicKey),
        counter: credential.counter,
        transports: parseTransports(credential.transports),
      },
      requireUserVerification: true,
    })

    if (!verification.verified || !verification.authenticationInfo) {
      return response.badRequest({
        message: i18n.formatMessage('errors.webauthnVerificationFailed'),
      })
    }

    await db()
      .updateTable('webauthnCredentials')
      .set({
        counter: verification.authenticationInfo.newCounter,
        updatedAt: new Date(),
      })
      .where('id', '=', credential.id)
      .execute()

    const user = await db()
      .selectFrom('users')
      .selectAll()
      .where('users.id', '=', credential.userId)
      .executeTakeFirst()

    /* v8 ignore next */
    if (!user) return response.badRequest({ message: i18n.formatMessage('errors.userNotFound') })

    await auth.use('web').login(user)

    // Passkey alone counts as MFA - no OTP required
    markTwoFactorPassed(session)
    session.forget('passwordlessChallenge')
    session.forget('passwordlessEmail')
    return response.redirect('/')
  }

  /**
   * Delete session
   */
  async destroy({ response, auth, session }: HttpContext) {
    await auth.use('web').logout()
    resetTwoFactorSession(session)
    resetSecurityConfirmation(session)
    return response.redirect('/')
  }
}
