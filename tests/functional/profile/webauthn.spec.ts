import { test } from '@japa/runner'
import { withGlobalTransaction } from '#services/db'
import { createUser } from '#tests/support/factories/user'
import { createWebauthnCredential } from '#tests/support/factories/webauthn_credential'
import { WEBAUTHN_REG_CHALLENGE_KEY } from '#controllers/profile/webauthn_controller'
import WebauthnService from '#services/webauthn'
import app from '@adonisjs/core/services/app'
import mail from '@adonisjs/mail/services/main'
import Sinon from 'sinon'

import SecuritySettingsChangedMail from '#mails/security_settings_changed'

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

  test('store queues an email when a passkey is registered', async ({ client }) => {
    const fakeMailer = mail.fake()

    const user = await createUser()

    app.container.swap(WebauthnService, () => {
      const service = new WebauthnService()
      Sinon.stub(service.webauthnServer, 'verifyRegistrationResponse').resolves({
        verified: true,
        registrationInfo: {
          credential: {
            id: 'credential-id',
            publicKey: new Uint8Array([1, 2, 3]),
            counter: 0,
          },
          credentialDeviceType: 'singleDevice',
          credentialBackedUp: false,
        },
      } as any)
      return service
    })

    const response = await client
      .post('/profile/webauthn')
      .json({
        friendlyName: 'Work laptop',
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

    response.assertStatus(200)

    fakeMailer.mails.assertQueuedCount(SecuritySettingsChangedMail, 1)
    fakeMailer.mails.assertQueued(SecuritySettingsChangedMail, (notification) => {
      notification.message.assertTo(user.email)
      notification.message.assertSubject('Passkey added')
      notification.message.assertTextIncludes('A passkey was added to your account.')
      notification.message.assertTextIncludes('Passkey name: Work laptop')
      return true
    })

    app.container.restore(WebauthnService)
  })

  test('destroy queues an email when a passkey is removed', async ({ client }) => {
    const fakeMailer = mail.fake()

    const user = await createUser()
    const credential = await createWebauthnCredential({
      userId: user.id,
      friendlyName: 'Phone',
    })

    const response = await client
      .delete(`/profile/webauthn/${credential.id}`)
      .withCsrfToken()
      .loginAs(user)
      .withSession(withSecurityConfirmed())

    response.assertStatus(200)

    fakeMailer.mails.assertQueuedCount(SecuritySettingsChangedMail, 1)
    fakeMailer.mails.assertQueued(SecuritySettingsChangedMail, (notification) => {
      notification.message.assertTo(user.email)
      notification.message.assertSubject('Passkey removed')
      notification.message.assertTextIncludes('A passkey was removed from your account.')
      notification.message.assertTextIncludes('Passkey name: Phone')
      return true
    })
  })
})
