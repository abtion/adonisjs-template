import type { HttpContext } from '@adonisjs/core/http'
import * as webauthnServer from '@simplewebauthn/server'
import type { AuthenticationResponseJSON } from '@simplewebauthn/types'

import { db } from '#services/db'
import { fromBase64Url, getOrigin, getRpId } from '#services/webauthn_service'
import { confirmSecurityValidator } from '#validators/confirm_security_validator'
import hash from '@adonisjs/core/services/hash'
import FormError from '#exceptions/form_error'

export const SECURITY_CONFIRMATION_CHALLENGE_KEY = 'securityConfirmationChallenge'

export default class ProfileConfirmSecurityController {
  async index({ auth, session, response }: HttpContext) {
    const user = auth.user!
    const credentials = await db()
      .selectFrom('webauthnCredentials')
      .selectAll()
      .where('webauthnCredentials.userId', '=', user.id)
      .execute()

    const options = await webauthnServer.generateAuthenticationOptions({
      rpID: getRpId(),
      userVerification: 'preferred',
      allowCredentials: credentials.map((credential) => ({
        id: credential.credentialId,
        type: 'public-key' as const,
        transports: credential.transports,
      })),
    })

    session.put(SECURITY_CONFIRMATION_CHALLENGE_KEY, options.challenge)

    return response.ok({ options, hasWebauthn: credentials.length > 0 })
  }

  async store({ auth, security, request, session, response, i18n }: HttpContext) {
    const user = auth.user!
    const data = await request.validateUsing(confirmSecurityValidator)
    const expectedChallengeValue = session.get(SECURITY_CONFIRMATION_CHALLENGE_KEY)
    const expectedChallenge =
      typeof expectedChallengeValue === 'string' ? expectedChallengeValue : undefined

    if (!data.password && !data.assertion) {
      throw new FormError(i18n.t('errors.passwordOrWebauthnRequired'))
    }

    if (data.password) {
      const isPasswordValid = await hash.verify(user.password, data.password)
      if (!isPasswordValid) {
        throw new FormError(i18n.t('errors.invalidPassword'))
      }
      security.confirm()
      session.forget(SECURITY_CONFIRMATION_CHALLENGE_KEY)
      return response.ok({ confirmed: true })
    }

    if (data.assertion && expectedChallenge) {
      // Type is validated by confirmSecurityValidator
      const assertion = data.assertion as AuthenticationResponseJSON
      const credential = await db()
        .selectFrom('webauthnCredentials')
        .selectAll()
        .where('webauthnCredentials.userId', '=', user.id)
        .where('webauthnCredentials.credentialId', '=', assertion.id)
        .executeTakeFirst()

      if (!credential) {
        throw new FormError(i18n.t('errors.credentialNotFound'))
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
          transports: credential.transports,
        },
        requireUserVerification: true,
      })

      if (!verification.verified || !verification.authenticationInfo) {
        throw new FormError(i18n.t('errors.webauthnVerificationFailed'))
      }

      await db()
        .updateTable('webauthnCredentials')
        .set({
          counter: verification.authenticationInfo.newCounter,
          updatedAt: new Date(),
        })
        .where('id', '=', credential.id)
        .execute()

      security.confirm()
      session.forget(SECURITY_CONFIRMATION_CHALLENGE_KEY)
      return response.ok({ confirmed: true })
    }

    if (data.assertion && !expectedChallenge) {
      throw new FormError(i18n.t('errors.securityConfirmationChallengeNotFound'))
    }
  }
}
