import { WebauthnCredentials } from '#database/types'
import FormError from '#exceptions/form_error'
import env from '#start/env'
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  VerifiedAuthenticationResponse,
  VerifiedRegistrationResponse,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server'
import { AuthenticationResponseJSON, RegistrationResponseJSON } from '@simplewebauthn/types'
import { Selectable } from 'kysely'
import { db } from './db.js'

export function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const buffer = Buffer.from(value, 'base64url')
  const arrayBuffer = new ArrayBuffer(buffer.length)
  const uint8Array = new Uint8Array(arrayBuffer)
  uint8Array.set(buffer)
  return uint8Array as Uint8Array<ArrayBuffer>
}

export class WebauthnError extends Error {
  constructor(protected originalError?: Error) {
    super()
  }

  toFormError() {
    const klass = this.constructor
    let translationKey = errorTranslationKeys.get(klass) ?? 'errors.fallbackError'
    return new FormError(translationKey)
  }
}

class CredentialNotFoundError extends WebauthnError {}
class VerifyAuthenticationError extends WebauthnError {}
class VerifyRegistrationError extends WebauthnError {}

const errorTranslationKeys = new Map<Function, string>([
  [CredentialNotFoundError, 'errors.fallbackError'],
  [VerifyAuthenticationError, 'errors.webauthnVerificationFailed'],
  [VerifyRegistrationError, 'errors.webauthnVerificationFailed'],
])

export default class WebauthnService {
  webauthnServer = {
    generateRegistrationOptions,
    verifyRegistrationResponse,
    generateAuthenticationOptions,
    verifyAuthenticationResponse,
  }

  fallbackOrigin = `http://${env.get('HOST', 'localhost')}:${env.get('PORT', '3333')}`
  rpId = env.get(
    'WEBAUTHN_RP_ID',
    new URL(env.get('WEBAUTHN_ORIGIN', this.fallbackOrigin)).hostname
  )
  origin = env.get('WEBAUTHN_ORIGIN', this.fallbackOrigin)
  rpName = env.get('WEBAUTHN_RP_NAME', env.get('APP_ISSUER', 'Project Name Human'))

  getAuthenticationOptions(credentials: Selectable<WebauthnCredentials>[]) {
    return this.webauthnServer.generateAuthenticationOptions({
      rpID: this.rpId,
      userVerification: 'preferred',
      allowCredentials: credentials.map((credential) => ({
        id: credential.credentialId,
        type: 'public-key',
        transports: credential.transports,
      })),
    })
  }

  getRegistrationOptions(
    user: { id: number; email: string; name: string },
    excludeCredentials: { credentialId: string }[]
  ) {
    return this.webauthnServer.generateRegistrationOptions({
      rpName: this.rpName,
      rpID: this.rpId,
      userID: Buffer.from(String(user.id)),
      userName: user.email,
      userDisplayName: user.name,
      attestationType: 'none',
      excludeCredentials: excludeCredentials.map((credential) => ({
        id: credential.credentialId,
        type: 'public-key',
      })),
      authenticatorSelection: {
        userVerification: 'preferred',
      },
    })
  }

  async verifyRegistration(response: RegistrationResponseJSON, expectedChallenge: string) {
    let result: VerifiedRegistrationResponse | null = null
    try {
      result = await this.webauthnServer.verifyRegistrationResponse({
        response,
        expectedChallenge,
        expectedOrigin: this.origin,
        expectedRPID: this.rpId,
        requireUserVerification: true,
      })
    } catch (error) {
      throw new VerifyRegistrationError(error)
    }

    if (!result.verified) throw new VerifyRegistrationError()
    return result
  }

  async verifyAuthentication(assertion: AuthenticationResponseJSON, expectedChallenge: string) {
    const credential = await db()
      .selectFrom('webauthnCredentials')
      .selectAll()
      .where('webauthnCredentials.credentialId', '=', assertion.id)
      .executeTakeFirst()

    if (!credential) throw new CredentialNotFoundError()

    let verification: VerifiedAuthenticationResponse | null = null
    try {
      verification = await this.webauthnServer.verifyAuthenticationResponse({
        response: assertion,
        expectedChallenge,
        expectedOrigin: this.origin,
        expectedRPID: this.rpId,
        credential: {
          id: credential.credentialId,
          publicKey: fromBase64Url(credential.publicKey),
          counter: credential.counter,
          transports: credential.transports,
        },
        requireUserVerification: true,
      })
    } catch (error) {
      throw new VerifyAuthenticationError(error)
    }

    if (!verification.verified) throw new VerifyAuthenticationError()

    await db()
      .updateTable('webauthnCredentials')
      .set({
        counter: verification.authenticationInfo.newCounter,
        updatedAt: new Date(),
      })
      .where('id', '=', credential.id)
      .execute()
  }
}
