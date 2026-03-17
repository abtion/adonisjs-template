import { TOTP_USER_ID_KEY } from '#controllers/session/totp_controller'
import { withGlobalTransaction } from '#services/db'
import { createUser } from '#tests/support/factories/user'
import encryption from '@adonisjs/core/services/encryption'
import mail from '@adonisjs/mail/services/main'
import { test } from '@japa/runner'

import SecuritySettingsChangedMail from '#mails/security_settings_changed'

test.group('Session TOTP Recover', (group) => {
  group.each.setup(() => withGlobalTransaction())

  test('index returns unauthorized when no user in session', async ({ client }) => {
    const response = await client.get('/session/totp/recover')

    response.assertStatus(401)
  })

  test('index shows canRecover false when recovery codes is null', async ({ client }) => {
    const user = await createUser({
      totpEnabled: true,
      totpSecretEncrypted: encryption.encrypt('test-secret'),
      totpRecoveryCodesEncrypted: null,
    })

    const response = await client
      .get('/session/totp/recover')
      .withInertia()
      .withSession({ [TOTP_USER_ID_KEY]: user.id })

    response.assertStatus(200)
    response.assertInertiaPropsContains({ canRecover: false })
  })

  test('store returns unauthorized when no user in session', async ({ client }) => {
    const response = await client
      .post('/session/totp/recover')
      .json({ recoveryCode: 'ABCDE-FGHIJ' })
      .withCsrfToken()
      .withSession({})

    response.assertStatus(401)
  })

  test('store throws error when TOTP secret and recovery codes are not set', async ({ client }) => {
    const user = await createUser({
      totpEnabled: true,
      totpSecretEncrypted: null,
      totpRecoveryCodesEncrypted: null,
    })

    const response = await client
      .post('/session/totp/recover')
      .json({ recoveryCode: 'ABCDE-FGHIJ' })
      .withCsrfToken()
      .withSession({ [TOTP_USER_ID_KEY]: user.id })

    response.assertStatus(422)
    response.assertBodyContains({ message: 'errors.totpSecretNotGenerated' })
  })

  test('store throws error when recovery code is invalid', async ({ client }) => {
    const user = await createUser({
      totpEnabled: true,
      totpSecretEncrypted: encryption.encrypt('test-secret'),
      totpRecoveryCodesEncrypted: encryption.encrypt(['VALID-CODE1', 'VALID-CODE2']),
    })

    const response = await client
      .post('/session/totp/recover')
      .json({ recoveryCode: 'WRONG-CODE1' })
      .withCsrfToken()
      .withSession({ [TOTP_USER_ID_KEY]: user.id })

    response.assertStatus(422)
    response.assertBodyContains({ message: 'errors.recoveryCodeInvalid' })
  })

  test('store queues an email when a recovery code is used', async ({ client }) => {
    const fakeMailer = mail.fake()

    try {
      const user = await createUser({
        email: 'user@example.com',
        totpEnabled: true,
        totpSecretEncrypted: encryption.encrypt('test-secret'),
        totpRecoveryCodesEncrypted: encryption.encrypt(['VALID-CODE1', 'VALID-CODE2']),
      })

      const response = await client
        .post('/session/totp/recover')
        .json({ recoveryCode: 'VALID-CODE1' })
        .withCsrfToken()
        .withSession({ [TOTP_USER_ID_KEY]: user.id })

      response.assertRedirectsTo('/')

      fakeMailer.mails.assertQueuedCount(SecuritySettingsChangedMail, 1)
      fakeMailer.mails.assertQueued(SecuritySettingsChangedMail, (notification) => {
        notification.message.assertTo(user.email)
        notification.message.assertSubject('Recovery code used')
        notification.message.assertTextIncludes('A recovery code was used to sign in')
        notification.message.assertTextIncludes('Remaining recovery codes: 1')
        return true
      })
    } finally {
      mail.restore()
    }
  })
})
