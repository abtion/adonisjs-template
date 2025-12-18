import type { HttpContext } from '@adonisjs/core/http'
import {
  loadUserWithTwoFactor,
  markSecurityConfirmed,
  isSecurityConfirmed,
  SECURITY_CONFIRMATION_CHALLENGE_KEY,
  parseTransports,
  parseRecoveryCodes,
  generateAndStoreTwoFactorSecret,
} from '#services/two_factor'
import { getRpId, getOrigin, fromBase64Url } from '#services/webauthn_service'
import { confirmSecurityValidator } from '#validators/profile_validator'
import { db } from '#services/db'
import hash from '@adonisjs/core/services/hash'
import { webauthnServer } from '#services/webauthn_server'
import type { AuthenticationResponseJSON } from '@simplewebauthn/types'

export default class ProfileController {
  async show({ auth, inertia }: HttpContext) {
    const user = auth.user!
    const recoveryCodes = parseRecoveryCodes(user.twoFactorRecoveryCodes)

    const webauthnCredentials = await db()
      .selectFrom('webauthnCredentials')
      .select(['id', 'friendlyName', 'createdAt', 'updatedAt'])
      .where('userId', '=', user.id)
      .orderBy('createdAt', 'desc')
      .execute()

    const hasWebauthn = webauthnCredentials.length > 0

    return inertia.render('profile/index', {
      user: {
        name: user.name,
        email: user.email,
      },
      twoFactor: {
        enabled: user.isTwoFactorEnabled,
        hasWebauthn,
        recoveryCodesCount: recoveryCodes.length,
      },
      passkeys: webauthnCredentials.map((cred) => ({
        id: cred.id,
        friendlyName: cred.friendlyName,
        createdAt: cred.createdAt,
        lastUsed: cred.updatedAt,
      })),
    })
  }

  async confirmSecurity({ auth, request, session, response, i18n }: HttpContext) {
    const user = await loadUserWithTwoFactor(auth.user!.id)
    const data = await request.validateUsing(confirmSecurityValidator)
    const expectedChallengeValue = session.get(SECURITY_CONFIRMATION_CHALLENGE_KEY)
    const expectedChallenge =
      typeof expectedChallengeValue === 'string' ? expectedChallengeValue : undefined

    // Ensure at least one authentication method is provided
    if (!data.password && !data.assertion) {
      return response.badRequest({
        message: i18n.formatMessage('errors.passwordOrPasskeyRequired'),
      })
    }

    // Verify password
    if (data.password) {
      const isPasswordValid = await hash.verify(user.password, data.password)
      if (!isPasswordValid) {
        return response.unauthorized({ message: i18n.formatMessage('errors.invalidPassword') })
      }
      markSecurityConfirmed(session)
      session.forget(SECURITY_CONFIRMATION_CHALLENGE_KEY)
      return response.ok({ confirmed: true })
    }

    // Verify passkey
    if (data.assertion && expectedChallenge) {
      // Type is validated by confirmSecurityValidator
      const assertion: AuthenticationResponseJSON = data.assertion as AuthenticationResponseJSON
      const credential = await db()
        .selectFrom('webauthnCredentials')
        .selectAll()
        .where('webauthnCredentials.userId', '=', user.id)
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
          message: i18n.formatMessage('errors.passkeyVerificationFailed'),
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

      markSecurityConfirmed(session)
      session.forget(SECURITY_CONFIRMATION_CHALLENGE_KEY)
      return response.ok({ confirmed: true })
    }

    // If assertion provided but no challenge in session
    if (data.assertion && !expectedChallenge) {
      return response.badRequest({
        message: i18n.formatMessage('errors.securityConfirmationChallengeNotFound'),
      })
    }
  }

  async confirmSecurityOptions({ auth, session, response }: HttpContext) {
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
        transports: parseTransports(credential.transports),
      })),
    })

    session.put(SECURITY_CONFIRMATION_CHALLENGE_KEY, options.challenge)

    return response.ok({ options, hasPasskeys: credentials.length > 0 })
  }

  async enable({ auth, response, session, i18n }: HttpContext) {
    const user = auth.user!

    if (!isSecurityConfirmed(session)) {
      return response.unauthorized({
        message: i18n.formatMessage('errors.securityConfirmationRequired'),
      })
    }

    if (user.isTwoFactorEnabled) {
      return response.badRequest({
        message: i18n.formatMessage('errors.twoFactorAlreadyEnabled'),
      })
    }

    const { secret, recoveryCodes } = await generateAndStoreTwoFactorSecret(user.id, user.email)

    return response.ok({ secret, recoveryCodes })
  }

  async removePasskey({ auth, request, response, session, i18n }: HttpContext) {
    const user = auth.user!

    if (!isSecurityConfirmed(session)) {
      return response.unauthorized({
        message: i18n.formatMessage('errors.securityConfirmationRequiredRemovePasskeys'),
      })
    }

    const credentialIdParam = request.param('id')
    if (!credentialIdParam) {
      return response.badRequest({ message: i18n.formatMessage('errors.credentialIdRequired') })
    }

    const credentialId = Number.parseInt(credentialIdParam, 10)
    if (!Number.isInteger(credentialId) || credentialId <= 0) {
      return response.badRequest({ message: i18n.formatMessage('errors.invalidCredentialId') })
    }

    // Verify the credential belongs to the user
    const credential = await db()
      .selectFrom('webauthnCredentials')
      .select(['id', 'userId'])
      .where('id', '=', credentialId)
      .where('userId', '=', user.id)
      .executeTakeFirst()

    if (!credential) {
      return response.notFound({ message: i18n.formatMessage('errors.passkeyNotFound') })
    }

    await db()
      .deleteFrom('webauthnCredentials')
      .where('id', '=', credentialId)
      .where('userId', '=', user.id)
      .execute()

    return response.ok({ message: i18n.formatMessage('errors.passkeyRemovedSuccessfully') })
  }
}
