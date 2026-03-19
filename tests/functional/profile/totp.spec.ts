import { test } from '@japa/runner'
import { withGlobalTransaction } from '#services/db'
import { createUser } from '#tests/support/factories/user'
import encryption from '@adonisjs/core/services/encryption'
import { generateSecret, generateToken } from '#services/totp'
import mail from '@adonisjs/mail/services/main'

import SecuritySettingsChangedMail from '#mails/security_settings_changed'

const withSecurityConfirmed = () => ({ securityConfirmedAt: Date.now() })

test.group('Profile TOTP', (group) => {
  group.each.setup(() => withGlobalTransaction())

  test('store throws error when TOTP is already enabled', async ({ client }) => {
    const user = await createUser({ totpEnabled: true })

    const response = await client
      .post('/profile/totp')
      .withCsrfToken()
      .loginAs(user)
      .withSession(withSecurityConfirmed())

    response.assertStatus(422)
    response.assertBodyContains({ message: 'errors.totpAlreadyEnabled' })
  })

  test('verify throws error when TOTP secret is not set', async ({ client }) => {
    const user = await createUser({
      totpEnabled: false,
      totpSecretEncrypted: null,
      totpRecoveryCodesEncrypted: null,
    })

    const response = await client
      .post('/profile/totp/verify')
      .json({ otp: '123456' })
      .withCsrfToken()
      .loginAs(user)

    response.assertStatus(422)
    response.assertBodyContains({ message: 'errors.totpSecretNotGenerated' })
  })

  test('verify throws error when OTP is invalid', async ({ client }) => {
    const totpSecret = await generateSecret('user@example.com')
    const user = await createUser({
      totpEnabled: false,
      totpSecretEncrypted: encryption.encrypt(totpSecret.secret),
      totpRecoveryCodesEncrypted: encryption.encrypt(['CODE-1', 'CODE-2']),
    })

    const response = await client
      .post('/profile/totp/verify')
      .json({ otp: '000000' })
      .withCsrfToken()
      .loginAs(user)

    response.assertStatus(422)
    response.assertBodyContains({ message: 'errors.otpInvalid' })
  })

  test('verify queues an email when TOTP is enabled', async ({ client }) => {
    const fakeMailer = mail.fake()

    try {
      const totpSecret = await generateSecret('user@example.com')
      const user = await createUser({
        email: 'user@example.com',
        totpEnabled: false,
        totpSecretEncrypted: encryption.encrypt(totpSecret.secret),
        totpRecoveryCodesEncrypted: encryption.encrypt(['CODE-1', 'CODE-2']),
      })

      const response = await client
        .post('/profile/totp/verify')
        .json({ otp: generateToken(totpSecret.secret)! })
        .withCsrfToken()
        .loginAs(user)

      response.assertStatus(200)

      fakeMailer.mails.assertQueuedCount(SecuritySettingsChangedMail, 1)
      fakeMailer.mails.assertQueued(SecuritySettingsChangedMail, (notification) => {
        notification.message.assertTo(user.email)
        notification.message.assertSubject('Two-factor authentication enabled')
        notification.message.assertTextIncludes('Two-factor authentication was enabled')
        return true
      })
    } finally {
      mail.restore()
    }
  })

  test('destroy throws error when TOTP is not enabled', async ({ client }) => {
    const user = await createUser({ totpEnabled: false })

    const response = await client
      .delete('/profile/totp')
      .json({ otp: '123456' })
      .withCsrfToken()
      .loginAs(user)
      .withSession(withSecurityConfirmed())

    response.assertStatus(422)
    response.assertBodyContains({ message: 'errors.userWithout2FaActive' })
  })

  test('destroy throws error when TOTP secret is not set', async ({ client }) => {
    const user = await createUser({
      totpEnabled: true,
      totpSecretEncrypted: null,
      totpRecoveryCodesEncrypted: null,
    })

    const response = await client
      .delete('/profile/totp')
      .json({ otp: '123456' })
      .withCsrfToken()
      .loginAs(user)
      .withSession(withSecurityConfirmed())

    response.assertStatus(422)
    response.assertBodyContains({ message: 'errors.totpSecretNotGenerated' })
  })

  test('destroy throws error when OTP is invalid', async ({ client }) => {
    const totpSecret = await generateSecret('user@example.com')
    const user = await createUser({
      totpEnabled: true,
      totpSecretEncrypted: encryption.encrypt(totpSecret.secret),
      totpRecoveryCodesEncrypted: encryption.encrypt(['RECOVERY-CODE-1']),
    })

    const response = await client
      .delete('/profile/totp')
      .json({ otp: '000000' })
      .withCsrfToken()
      .loginAs(user)
      .withSession(withSecurityConfirmed())

    response.assertStatus(422)
    response.assertBodyContains({ message: 'errors.otpInvalid' })
  })

  test('destroy queues an email when TOTP is disabled', async ({ client }) => {
    const fakeMailer = mail.fake()

    try {
      const totpSecret = await generateSecret('user@example.com')
      const user = await createUser({
        email: 'user@example.com',
        totpEnabled: true,
        totpSecretEncrypted: encryption.encrypt(totpSecret.secret),
        totpRecoveryCodesEncrypted: encryption.encrypt(['CODE-1', 'CODE-2']),
      })

      const validOtp = generateToken(totpSecret.secret)!
      const response = await client
        .delete('/profile/totp')
        .json({ otp: validOtp })
        .withCsrfToken()
        .loginAs(user)
        .withSession(withSecurityConfirmed())

      response.assertStatus(204)

      fakeMailer.mails.assertQueuedCount(SecuritySettingsChangedMail, 1)
      fakeMailer.mails.assertQueued(SecuritySettingsChangedMail, (notification) => {
        notification.message.assertTo(user.email)
        notification.message.assertSubject('Two-factor authentication disabled')
        notification.message.assertTextIncludes('Two-factor authentication was disabled')
        return true
      })
    } finally {
      mail.restore()
    }
  })

  test('regenerateRecoveryCodes throws error when TOTP is not enabled', async ({ client }) => {
    const user = await createUser({ totpEnabled: false })

    const response = await client
      .post('/profile/totp/regeneration')
      .withCsrfToken()
      .loginAs(user)
      .withSession(withSecurityConfirmed())

    response.assertStatus(422)
    response.assertBodyContains({ message: 'errors.userWithout2FaActive' })
  })

  test('regenerateRecoveryCodes queues an email when recovery codes change', async ({ client }) => {
    const fakeMailer = mail.fake()

    try {
      const totpSecret = await generateSecret('user@example.com')
      const user = await createUser({
        email: 'user@example.com',
        totpEnabled: true,
        totpSecretEncrypted: encryption.encrypt(totpSecret.secret),
        totpRecoveryCodesEncrypted: encryption.encrypt(['CODE-1', 'CODE-2']),
      })

      const response = await client
        .post('/profile/totp/regeneration')
        .withCsrfToken()
        .loginAs(user)
        .withSession(withSecurityConfirmed())

      response.assertStatus(200)

      fakeMailer.mails.assertQueuedCount(SecuritySettingsChangedMail, 1)
      fakeMailer.mails.assertQueued(SecuritySettingsChangedMail, (notification) => {
        notification.message.assertTo(user.email)
        notification.message.assertSubject('Recovery codes regenerated')
        notification.message.assertTextIncludes('New two-factor recovery codes were generated')
        return true
      })
    } finally {
      mail.restore()
    }
  })
})
