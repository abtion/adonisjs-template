import { TOTP_USER_ID_KEY } from '#controllers/session/totp_controller'
import { withGlobalTransaction } from '#services/db'
import { createUser } from '#tests/support/factories/user'
import encryption from '@adonisjs/core/services/encryption'
import { test } from '@japa/runner'
import adonis2fa from '@nulix/adonis-2fa/services/main'

test.group('Session TOTP', (group) => {
  group.each.setup(() => withGlobalTransaction())

  test('index redirects to home when no user in session', async ({ client }) => {
    const response = await client.get('/session/totp')

    response.assertRedirectsTo('/')
  })

  test('store redirects to home when no user in session', async ({ client }) => {
    const response = await client.post('/session/totp').json({ otp: '123456' }).withCsrfToken()

    response.assertRedirectsTo('/')
  })

  test('store throws error when TOTP secret is not set', async ({ client }) => {
    const user = await createUser({
      totpEnabled: true,
      totpSecretEncrypted: null,
    })

    const response = await client
      .post('/session/totp')
      .json({ otp: '123456' })
      .withCsrfToken()
      .withSession({ [TOTP_USER_ID_KEY]: user.id })

    response.assertStatus(422)
    response.assertBodyContains({ message: 'errors.totpSecretNotGenerated' })
  })

  test('store throws error when OTP is invalid', async ({ client }) => {
    const totpSecret = await adonis2fa.generateSecret('user@example.com')
    const user = await createUser({
      totpEnabled: true,
      totpSecretEncrypted: encryption.encrypt(totpSecret.secret),
    })

    const response = await client
      .post('/session/totp')
      .json({ otp: '000000' })
      .withCsrfToken()
      .withSession({ [TOTP_USER_ID_KEY]: user.id })

    response.assertStatus(422)
    response.assertBodyContains({ message: 'errors.otpInvalid' })
  })
})
