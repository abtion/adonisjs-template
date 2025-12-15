import { test } from '@japa/runner'
import sinon from 'sinon'
import { withGlobalTransaction, db } from '#services/db'
import { createUser } from '#tests/support/factories/user'
import twoFactorAuth from '@nulix/adonis-2fa/services/main'
import { sql } from 'kysely'

test.group('TwoFactorController', (group) => {
  group.each.setup(() => withGlobalTransaction())
  group.each.teardown(() => sinon.restore())

  test('challenge bypasses when 2FA not enabled', async ({ client }) => {
    const user = await createUser({ email: 'no2fa@example.com', isTwoFactorEnabled: false })

    const response = await client.get('/2fa/challenge').loginAs(user).redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/')
  })

  test('challenge renders methods when 2FA enabled', async ({ client }) => {
    const user = await createUser({
      email: 'with2fa@example.com',
      isTwoFactorEnabled: true,
      twoFactorSecret: sql`cast('{"secret":"abc"}' as jsonb)`,
      twoFactorRecoveryCodes: ['code1', 'code2'],
    })

    const response = await client.get('/2fa/challenge').withInertia().loginAs(user)

    response.assertStatus(200)
    response.assertBodyContains({
      props: {
        methods: { totp: true, recovery: true },
      },
    })
  })

  test('generate requires security confirmation', async ({ client }) => {
    const user = await createUser({ email: 'gen-nosec@example.com', isTwoFactorEnabled: false })

    const response = await client.post('/2fa/totp/generate').loginAs(user).withCsrfToken()

    response.assertStatus(401)
    response.assertBodyContains({
      message: 'Security confirmation required to modify 2FA settings',
    })
  })

  test('generate rejects when 2FA enabled but not passed', async ({ client }) => {
    const user = await createUser({ email: 'gen-notpassed@example.com', isTwoFactorEnabled: true })

    const response = await client
      .post('/2fa/totp/generate')
      .loginAs(user)
      .withSession({ securityConfirmation: true, twoFactorPassed: false })
      .withCsrfToken()

    response.assertStatus(401)
    response.assertBodyContains({
      message: 'Two-factor authentication required to modify settings',
    })
  })

  test('generate returns secret and recovery codes and stores pending state', async ({
    client,
    assert,
  }) => {
    const user = await createUser({ email: 'gen-success@example.com', isTwoFactorEnabled: false })
    const secret = { secret: 'SECRET', uri: 'otpauth://secret', qr: '' }
    const recoveryCodes = ['RC1', 'RC2', 'RC3']
    sinon.stub(twoFactorAuth, 'generateSecret').resolves(secret as any)
    sinon.stub(twoFactorAuth, 'generateRecoveryCodes').returns(recoveryCodes)

    const response = await client
      .post('/2fa/totp/generate')
      .loginAs(user)
      .withSession({ securityConfirmation: true, twoFactorPassed: true })
      .withCsrfToken()

    response.assertStatus(200)
    response.assertBodyContains({ secret, recoveryCodes })

    const stored = await db()
      .selectFrom('users')
      .select(['twoFactorSecret', 'isTwoFactorEnabled', 'twoFactorRecoveryCodes'])
      .where('id', '=', user.id)
      .executeTakeFirstOrThrow()

    assert.deepEqual(stored.twoFactorSecret, secret)
    assert.isFalse(stored.isTwoFactorEnabled)
    assert.deepEqual(stored.twoFactorRecoveryCodes, recoveryCodes)
  })

  test('verify fails when secret missing', async ({ client }) => {
    const user = await createUser({
      email: 'verify-nosecret@example.com',
      isTwoFactorEnabled: false,
      twoFactorSecret: null,
    })

    const response = await client
      .post('/2fa/totp/verify')
      .form({ otp: '123456' })
      .loginAs(user)
      .withCsrfToken()
      .redirects(0)

    response.assertStatus(400)
    response.assertBodyContains({ message: 'Two-factor secret not generated' })
  })

  test('verify fails when otp invalid', async ({ client }) => {
    const secret = { secret: 'SECRET', uri: 'otpauth://secret', qr: '' }
    const user = await createUser({
      email: 'verify-invalid@example.com',
      isTwoFactorEnabled: false,
      twoFactorSecret: secret,
      twoFactorRecoveryCodes: ['CODE1'],
    })
    sinon.stub(twoFactorAuth, 'verifyToken').returns(false)

    const response = await client
      .post('/2fa/totp/verify')
      .form({ otp: 'BAD1' })
      .loginAs(user)
      .withCsrfToken()
      .redirects(0)

    response.assertStatus(400)
    response.assertBodyContains({ message: 'OTP invalid' })
  })

  test('verify enables 2FA and consumes recovery code', async ({ client, assert }) => {
    const secret = { secret: 'SECRET', uri: 'otpauth://secret', qr: '' }
    const recoveryCodes = ['CODE1', 'CODE2']
    const user = await createUser({
      email: 'verify-valid@example.com',
      isTwoFactorEnabled: false,
      twoFactorSecret: secret,
      twoFactorRecoveryCodes: recoveryCodes,
    })
    sinon.stub(twoFactorAuth, 'verifyToken').returns(true)

    const response = await client
      .post('/2fa/totp/verify')
      .form({ otp: 'CODE1' })
      .loginAs(user)
      .withCsrfToken()
      .redirects(0)

    response.assertStatus(200)
    response.assertBodyContains({ message: 'OTP valid' })

    const stored = await db()
      .selectFrom('users')
      .select(['isTwoFactorEnabled', 'twoFactorRecoveryCodes'])
      .where('id', '=', user.id)
      .executeTakeFirstOrThrow()
    assert.isTrue(stored.isTwoFactorEnabled)
    assert.deepEqual(stored.twoFactorRecoveryCodes, ['CODE2'])
  })

  test('verify parses stringified secret and enables 2FA', async ({ client, assert }) => {
    const secret = { secret: 'STRING_SECRET', uri: 'otpauth://string', qr: '' }
    const recoveryCodes = ['RC11', 'RC22']
    const user = await createUser({
      email: 'verify-string@example.com',
      isTwoFactorEnabled: false,
      twoFactorSecret: JSON.stringify(secret), // stored as JSON string to trigger parse branch
      twoFactorRecoveryCodes: recoveryCodes,
    })
    sinon.stub(twoFactorAuth, 'verifyToken').returns(true)

    const response = await client
      .post('/2fa/totp/verify')
      .form({ otp: 'RC11' })
      .loginAs(user)
      .withCsrfToken()
      .redirects(0)

    if (![200, 302].includes(response.status())) {
      throw new Error(`Unexpected status ${response.status()}`)
    }

    // Reload user to ensure 2FA enabled persisted
    const refreshed = await db()
      .selectFrom('users')
      .select(['isTwoFactorEnabled', 'twoFactorRecoveryCodes'])
      .where('id', '=', user.id)
      .executeTakeFirstOrThrow()

    assert.isTrue(refreshed.isTwoFactorEnabled)
  })

  test('generateRecoveryCodes requires 2FA enabled', async ({ client }) => {
    const user = await createUser({
      email: 'recovery-no2fa@example.com',
      isTwoFactorEnabled: false,
    })

    const response = await client
      .post('/2fa/recovery-codes')
      .loginAs(user)
      .withSession({ securityConfirmation: true, twoFactorPassed: true })
      .withCsrfToken()

    response.assertStatus(400)
    response.assertBodyContains({ message: 'User without 2FA active' })
  })

  test('generateRecoveryCodes requires security confirmation and 2FA passed', async ({
    client,
  }) => {
    const user = await createUser({
      email: 'recovery-guards@example.com',
      isTwoFactorEnabled: true,
    })

    const noSec = await client
      .post('/2fa/recovery-codes')
      .loginAs(user)
      .withSession({ twoFactorPassed: true })
      .withCsrfToken()
    noSec.assertStatus(401)

    const noPass = await client
      .post('/2fa/recovery-codes')
      .loginAs(user)
      .withSession({ securityConfirmation: true, twoFactorPassed: false })
      .withCsrfToken()
    noPass.assertStatus(401)
  })

  test('generateRecoveryCodes rotates codes when authorized', async ({ client, assert }) => {
    const user = await createUser({
      email: 'recovery-success@example.com',
      isTwoFactorEnabled: true,
    })
    const newCodes = ['A', 'B']
    sinon.stub(twoFactorAuth, 'generateRecoveryCodes').returns(newCodes as any)

    const response = await client
      .post('/2fa/recovery-codes')
      .loginAs(user)
      .withSession({ securityConfirmation: true, twoFactorPassed: true })
      .withCsrfToken()

    response.assertStatus(200)
    response.assertBodyContains({ recoveryCodes: newCodes })

    const stored = await db()
      .selectFrom('users')
      .select('twoFactorRecoveryCodes')
      .where('id', '=', user.id)
      .executeTakeFirstOrThrow()
    assert.deepEqual(stored.twoFactorRecoveryCodes, newCodes)
  })

  test('disable requires 2FA enabled and proper session', async ({ client }) => {
    const user = await createUser({ email: 'disable-no2fa@example.com', isTwoFactorEnabled: false })

    const notEnabled = await client
      .post('/2fa/disable')
      .loginAs(user)
      .withSession({ securityConfirmation: true, twoFactorPassed: true })
      .withCsrfToken()
    notEnabled.assertStatus(400)

    const enabledUser = await createUser({
      email: 'disable-guard@example.com',
      isTwoFactorEnabled: true,
    })

    const noSec = await client
      .post('/2fa/disable')
      .loginAs(enabledUser)
      .withSession({ twoFactorPassed: true })
      .withCsrfToken()
    noSec.assertStatus(401)

    const noPass = await client
      .post('/2fa/disable')
      .loginAs(enabledUser)
      .withSession({ securityConfirmation: true, twoFactorPassed: false })
      .withCsrfToken()
    noPass.assertStatus(401)
  })

  test('disable clears 2FA when authorized', async ({ client, assert }) => {
    const user = await createUser({
      email: 'disable-success@example.com',
      isTwoFactorEnabled: true,
      twoFactorSecret: sql`cast('{"secret":"abc"}' as jsonb)`,
      twoFactorRecoveryCodes: ['x'],
    })

    const response = await client
      .post('/2fa/disable')
      .loginAs(user)
      .withSession({ securityConfirmation: true, twoFactorPassed: true })
      .withCsrfToken()

    response.assertStatus(204)

    const stored = await db()
      .selectFrom('users')
      .select(['isTwoFactorEnabled', 'twoFactorSecret', 'twoFactorRecoveryCodes'])
      .where('id', '=', user.id)
      .executeTakeFirstOrThrow()

    assert.isFalse(stored.isTwoFactorEnabled)
    assert.isNull(stored.twoFactorSecret)
    assert.deepEqual(stored.twoFactorRecoveryCodes, [])
  })
})
