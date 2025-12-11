import { db } from '#services/db'
import { createSessionValidator } from '#validators/session_validator'
import hash from '@adonisjs/core/services/hash'
import { setTimeout } from 'node:timers/promises'
import { errors } from '@adonisjs/auth'
import type { HttpContext } from '@adonisjs/core/http'
import {
  markTwoFactorPassed,
  resetTwoFactorSession,
  requiresTwoFactor,
  getUserAuthInfo,
  resetSecurityConfirmation,
  parseTransports,
} from '#services/two_factor'
import { generateAuthenticationOptions, verifyAuthenticationResponse } from '@simplewebauthn/server'
import type { AuthenticationResponseJSON } from '@simplewebauthn/types'
import env from '#start/env'

const fallbackOrigin = `http://${env.get('HOST', 'localhost')}:${env.get('PORT', 3333)}`
const rpId = env.get('WEBAUTHN_RP_ID', new URL(env.get('WEBAUTHN_ORIGIN', fallbackOrigin)).hostname)
const origin = env.get('WEBAUTHN_ORIGIN', fallbackOrigin)

const fromBase64Url = (value: string) => Buffer.from(value, 'base64url')

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
  async checkEmail({ request, response }: HttpContext) {
    const email = request.input('email') as string | undefined

    if (!email) {
      return response.badRequest({ message: 'Email is required' })
    }

    const authInfo = await getUserAuthInfo(email)

    // Authentication will fail with generic error on server side if credentials are invalid
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

    await auth.use('web').login(verifiedUser)

    const needsTwoFactor = await requiresTwoFactor(verifiedUser.id, verifiedUser.isTwoFactorEnabled)

    if (needsTwoFactor) {
      session.put('twoFactorPassed', false)
      return response.redirect().toRoute('2fa.challenge')
    }

    markTwoFactorPassed(session)
    return response.redirect('/')
  }

  /**
   * Passwordless WebAuthn authentication options for a specific email
   */
  async passwordlessOptions({ request, session, response }: HttpContext) {
    const email = request.input('email') as string | undefined

    if (!email) {
      return response.badRequest({ message: 'Email is required' })
    }

    const user = await db()
      .selectFrom('users')
      .selectAll()
      .where('users.email', '=', email)
      .executeTakeFirst()

    if (!user) {
      return response.badRequest({ message: 'User not found' })
    }

    const credentials = await db()
      .selectFrom('webauthnCredentials')
      .selectAll()
      .where('webauthnCredentials.userId', '=', user.id)
      .execute()

    if (!credentials.length) {
      return response.badRequest({ message: 'No passkeys registered for this user' })
    }

    const options = await generateAuthenticationOptions({
      rpID: rpId,
      userVerification: 'preferred',
      allowCredentials: credentials.map((credential) => ({
        id: credential.credentialId,
        type: 'public-key' as const,
        transports: parseTransports(credential.transports),
      })),
    })

    session.put('passwordlessChallenge', options.challenge)
    session.put('passwordlessEmail', email)

    return response.ok({ options })
  }

  /**
   * Verify passwordless WebAuthn authentication and log in
   */
  async passwordlessVerify({ request, response, auth, session }: HttpContext) {
    const assertion = request.input('assertion') as AuthenticationResponseJSON | undefined
    const expectedChallenge = session.get('passwordlessChallenge') as string | undefined

    if (!assertion || !expectedChallenge) {
      return response.badRequest({ message: 'Missing authentication payload' })
    }

    const credential = await db()
      .selectFrom('webauthnCredentials')
      .selectAll()
      .where('webauthnCredentials.credentialId', '=', assertion.id)
      .executeTakeFirst()

    if (!credential) {
      return response.badRequest({ message: 'Credential not found' })
    }

    const verification = await verifyAuthenticationResponse({
      response: assertion,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpId,
      credential: {
        id: credential.credentialId,
        publicKey: fromBase64Url(credential.publicKey),
        counter: credential.counter,
        transports: parseTransports(credential.transports),
      },
      requireUserVerification: true,
    })

    if (!verification.verified || !verification.authenticationInfo) {
      return response.badRequest({ message: 'WebAuthn verification failed' })
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

    if (!user) {
      return response.badRequest({ message: 'User not found' })
    }

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
