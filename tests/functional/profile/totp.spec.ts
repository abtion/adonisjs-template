import { test } from '@japa/runner'
import { withGlobalTransaction } from '#services/db'
import { createUser } from '#tests/support/factories/user'
import encryption from '@adonisjs/core/services/encryption'
import adonis2fa from '@nulix/adonis-2fa/services/main'

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
    const totpSecret = await adonis2fa.generateSecret('user@example.com')
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

  test('destroy throws error when TOTP is not enabled', async ({ client }) => {
    const user = await createUser({ totpEnabled: false })

    const response = await client
      .delete('/profile/totp')
      .withCsrfToken()
      .loginAs(user)
      .withSession(withSecurityConfirmed())

    response.assertStatus(422)
    response.assertBodyContains({ message: 'errors.userWithout2FAActive' })
  })

  test('regenerateRecoveryCodes throws error when TOTP is not enabled', async ({ client }) => {
    const user = await createUser({ totpEnabled: false })

    const response = await client
      .post('/profile/totp/regeneration')
      .withCsrfToken()
      .loginAs(user)
      .withSession(withSecurityConfirmed())

    response.assertStatus(422)
    response.assertBodyContains({ message: 'errors.userWithout2FAActive' })
  })
})
