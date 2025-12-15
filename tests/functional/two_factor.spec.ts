import { test } from '@japa/runner'
import { db, withGlobalTransaction } from '#services/db'
import { createUser } from '#tests/support/factories/user'

test.group('Two factor authentication', (group) => {
  group.each.setup(() => withGlobalTransaction())

  test('sign-in redirects to 2FA challenge when enabled', async ({ client, assert }) => {
    const secret = { secret: 'TESTSECRET', uri: 'otpauth://2fa', qr: '' }
    const user = await createUser({
      email: '2fa@example.com',
      twoFactorSecret: JSON.stringify(secret),
      isTwoFactorEnabled: true,
    })

    const response = await client
      .post('/sign-in')
      .form({ email: user.email, password: 'password' })
      .redirects(0)
      .withCsrfToken()

    response.assertStatus(302)
    assert.equal(response.header('location'), '/2fa/challenge')
  })

  test('consumes recovery code during verification', async ({ client, assert }) => {
    const secret = { secret: 'TESTSECRET', uri: 'otpauth://recovery', qr: '' }
    const recoveryCodes = ['ABC DEF']
    const user = await createUser({
      email: 'recovery@example.com',
      twoFactorSecret: JSON.stringify(secret),
      twoFactorRecoveryCodes: recoveryCodes,
      isTwoFactorEnabled: true,
    })

    const verifyResponse = await client
      .post('/2fa/totp/verify')
      .form({ otp: recoveryCodes[0] })
      .loginAs(user)
      .withCsrfToken()

    verifyResponse.assertStatus(200)
    verifyResponse.assertBodyContains({ message: 'OTP valid' })

    const stored = await db()
      .selectFrom('users')
      .select(['twoFactorRecoveryCodes'])
      .where('id', '=', user.id)
      .executeTakeFirstOrThrow()

    assert.deepEqual(stored.twoFactorRecoveryCodes, [])
  })

  test('returns WebAuthn registration options', async ({ client, assert }) => {
    const user = await createUser({ email: 'passkey@example.com' })

    const response = await client
      .post('/2fa/webauthn/register/options')
      .loginAs(user)
      .withSession({ securityConfirmation: Date.now() })
      .withCsrfToken()

    response.assertStatus(200)
    assert.exists(response.body().options.challenge)
  })
})
