import { test } from '@japa/runner'
import { withGlobalTransaction } from '#services/db'
import { createUser } from '#tests/support/factories/user'
import { WEBAUTHN_REG_CHALLENGE_KEY } from '#controllers/profile/webauthn_controller'
import WebauthnService from '#services/webauthn'
import app from '@adonisjs/core/services/app'
import Sinon from 'sinon'

const withSecurityConfirmed = () => ({ securityConfirmedAt: Date.now() })

test.group('Profile WebAuthn', (group) => {
  group.each.setup(() => withGlobalTransaction())

  test('store throws error when attestation is missing', async ({ client }) => {
    const user = await createUser()

    const response = await client
      .post('/profile/webauthn')
      .json({})
      .withCsrfToken()
      .loginAs(user)
      .withSession(withSecurityConfirmed())

    response.assertStatus(422)
    response.assertBodyContains({ message: 'errors.missingRegistrationPayload' })
  })

  test('store throws error when attestation is invalid', async ({ client }) => {
    const user = await createUser()

    const response = await client
      .post('/profile/webauthn')
      .json({
        attestation: {
          id: 'test-id',
          rawId: 'test-raw-id',
          type: 'public-key',
          response: {
            clientDataJSON: 'test',
            attestationObject: 'test',
          },
        },
      })
      .withCsrfToken()
      .loginAs(user)
      .withSession({ ...withSecurityConfirmed(), [WEBAUTHN_REG_CHALLENGE_KEY]: 'some-key' })

    response.assertStatus(422)
    response.assertBodyContains({ message: 'errors.webauthnVerificationFailed' })
  })

  test('store throws error when attestation is not verified', async ({ client }) => {
    const user = await createUser()

    const response = await client
      .post('/profile/webauthn')
      .json({
        attestation: {
          id: 'test-id',
          rawId: 'test-raw-id',
          type: 'public-key',
          response: {
            clientDataJSON: 'test',
            attestationObject: 'test',
          },
        },
      })
      .withCsrfToken()
      .loginAs(user)
      .withSession({ ...withSecurityConfirmed(), [WEBAUTHN_REG_CHALLENGE_KEY]: 'some-key' })

    response.assertStatus(422)
    response.assertBodyContains({ message: 'errors.webauthnVerificationFailed' })
  })

  test('store throws error when challenge is missing from session', async ({ client }) => {
    const user = await createUser()

    const response = await client
      .post('/profile/webauthn')
      .json({
        attestation: {
          id: 'test-id',
          rawId: 'test-raw-id',
          type: 'public-key',
          response: {
            clientDataJSON: 'test',
            attestationObject: 'test',
          },
        },
      })
      .withCsrfToken()
      .loginAs(user)
      .withSession(withSecurityConfirmed())

    response.assertStatus(422)
    response.assertBodyContains({ message: 'errors.missingRegistrationPayload' })
  })

  test('store throws error when registration verification returns unverified', async ({
    client,
  }) => {
    const user = await createUser()

    app.container.swap(WebauthnService, () => {
      const service = new WebauthnService()
      Sinon.stub(service.webauthnServer, 'verifyRegistrationResponse').resolves({
        verified: false,
        registrationInfo: undefined,
      })
      return service
    })

    const response = await client
      .post('/profile/webauthn')
      .json({
        attestation: {
          id: 'test-id',
          rawId: 'test-raw-id',
          type: 'public-key',
          response: {
            clientDataJSON: 'test',
            attestationObject: 'test',
          },
        },
      })
      .withCsrfToken()
      .loginAs(user)
      .withSession({ ...withSecurityConfirmed(), [WEBAUTHN_REG_CHALLENGE_KEY]: 'test-challenge' })

    response.assertStatus(422)
    response.assertBodyContains({ message: 'errors.webauthnVerificationFailed' })

    app.container.restore(WebauthnService)
  })
})
