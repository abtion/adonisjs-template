import { test } from '@japa/runner'
import { withGlobalTransaction } from '#services/db'
import { createUser } from '#tests/support/factories/user'
import app from '@adonisjs/core/services/app'
import WebauthnService from '#services/webauthn'
import Sinon from 'sinon'
import { WEBAUTHN_CHALLENGE_KEY } from '#controllers/session_controller'
import { createWebauthnCredential } from '#tests/support/factories/webauthn_credential'
import { VerifiedAuthenticationResponse } from '@simplewebauthn/server'

test.group('Session Controller', (group) => {
  group.each.setup(() => withGlobalTransaction())

  test('store throws error when webauthn assertion is provided without challenge in session', async ({
    client,
  }) => {
    const user = await createUser()

    const response = await client
      .post(`/sign-in/${user.email}`)
      .json({
        assertion: {
          id: 'test-credential-id',
          rawId: 'test-raw-id',
          type: 'public-key',
          response: {
            clientDataJSON: 'test',
            authenticatorData: 'test',
            signature: 'test',
          },
        },
      })
      .withCsrfToken()

    response.assertStatus(422)
    response.assertBodyContains({ message: 'errors.missingAuthenticationPayload' })
  })

  test('store throws error when webauthn library raises an error', async ({ client }) => {
    const user = await createUser()
    const credential = await createWebauthnCredential({ userId: user.id })

    app.container.swap(WebauthnService, () => {
      const service = new WebauthnService()
      const authenticateStub = Sinon.stub(service.webauthnServer, 'verifyAuthenticationResponse')
      authenticateStub.callsFake(() => {
        throw new Error('Library error')
      })

      return service
    })

    const response = await client
      .post(`/sign-in/${user.email}`)
      .withSession({
        [WEBAUTHN_CHALLENGE_KEY]: 'testing-123',
      })
      .json({
        assertion: {
          id: credential.credentialId,
          rawId: 'test-raw-id',
          type: 'public-key',
          response: {
            clientDataJSON: 'test',
            authenticatorData: 'test',
            signature: 'test',
          },
        },
      })
      .withCsrfToken()

    response.assertBodyContains({ message: 'errors.webauthnVerificationFailed' })

    app.container.restore(WebauthnService)
  })

  test('store throws error when webauthn credential is not found', async ({ client }) => {
    const user = await createUser()

    const response = await client
      .post(`/sign-in/${user.email}`)
      .withSession({
        [WEBAUTHN_CHALLENGE_KEY]: 'testing-123',
      })
      .json({
        assertion: {
          id: 'non-existent-credential-id',
          rawId: 'test-raw-id',
          type: 'public-key',
          response: {
            clientDataJSON: 'test',
            authenticatorData: 'test',
            signature: 'test',
          },
        },
      })
      .withCsrfToken()

    response.assertStatus(422)
    response.assertBodyContains({ message: 'errors.fallbackError' })
  })

  test('store throws error when authentication verification returns unverified', async ({
    client,
  }) => {
    const user = await createUser()
    const credential = await createWebauthnCredential({ userId: user.id })

    app.container.swap(WebauthnService, () => {
      const service = new WebauthnService()
      Sinon.stub(service.webauthnServer, 'verifyAuthenticationResponse').resolves({
        verified: false,
      } as unknown as VerifiedAuthenticationResponse)
      return service
    })

    const response = await client
      .post(`/sign-in/${user.email}`)
      .withSession({
        [WEBAUTHN_CHALLENGE_KEY]: 'testing-123',
      })
      .json({
        assertion: {
          id: credential.credentialId,
          rawId: 'test-raw-id',
          type: 'public-key',
          response: {
            clientDataJSON: 'test',
            authenticatorData: 'test',
            signature: 'test',
          },
        },
      })
      .withCsrfToken()

    response.assertStatus(422)
    response.assertBodyContains({ message: 'errors.webauthnVerificationFailed' })

    app.container.restore(WebauthnService)
  })
})
