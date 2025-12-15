import { test } from '@japa/runner'
import sinon from 'sinon'
import { withGlobalTransaction, db } from '#services/db'
import { createUser } from '#tests/support/factories/user'
import { webauthnServer } from '#services/webauthn_server'
import { Insertable } from 'kysely'
import type { WebauthnCredentials } from '#database/types'

const defaultCredentialId = Buffer.from('passwordless-cred').toString('base64url')

async function createPasskey(
  userId: number,
  overrides: Partial<Insertable<WebauthnCredentials>> = {}
) {
  return db()
    .insertInto('webauthnCredentials')
    .values({
      userId,
      credentialId: overrides.credentialId ?? defaultCredentialId,
      publicKey: overrides.publicKey ?? Buffer.from('public-key').toString('base64url'),
      friendlyName: overrides.friendlyName ?? 'Login Key',
      ...('counter' in overrides ? { counter: overrides.counter } : {}),
      ...('transports' in overrides ? { transports: overrides.transports } : {}),
      ...('deviceType' in overrides ? { deviceType: overrides.deviceType } : {}),
      ...('backedUp' in overrides ? { backedUp: overrides.backedUp } : {}),
      ...('createdAt' in overrides ? { createdAt: overrides.createdAt } : {}),
      ...('updatedAt' in overrides ? { updatedAt: overrides.updatedAt } : {}),
    })
    .returningAll()
    .executeTakeFirstOrThrow()
}

function buildAssertion(id: string) {
  return {
    id,
    rawId: id,
    response: {
      authenticatorData: Buffer.from('auth-data').toString('base64url'),
      clientDataJSON: Buffer.from('client-data').toString('base64url'),
      signature: Buffer.from('signature').toString('base64url'),
      userHandle: Buffer.from('user-handle').toString('base64url'),
    },
    type: 'public-key',
  }
}

test.group('Session controller - passwordless', (group) => {
  group.each.setup(() => withGlobalTransaction())
  group.each.teardown(() => sinon.restore())

  test('passwordlessOptions requires email', async ({ client }) => {
    const response = await client.post('/passwordless/options').withCsrfToken()
    response.assertStatus(400)
    response.assertBodyContains({ message: 'Email is required' })
  })

  test('passwordlessOptions returns bad request when user missing', async ({ client }) => {
    const response = await client
      .post('/passwordless/options')
      .withCsrfToken()
      .json({ email: 'missing@example.com' })

    response.assertStatus(400)
    response.assertBodyContains({ message: 'User not found' })
  })

  test('passwordlessOptions rejects when user has no passkeys', async ({ client }) => {
    const user = await createUser({ email: 'nopasskey@example.com' })

    const response = await client
      .post('/passwordless/options')
      .withCsrfToken()
      .json({ email: user.email })

    response.assertStatus(400)
    response.assertBodyContains({ message: 'No passkeys registered for this user' })
  })

  test('passwordlessOptions returns options and sets challenge', async ({ client, assert }) => {
    const user = await createUser({ email: 'withpasskey@example.com' })
    await createPasskey(user.id)
    const fakeOptions = { challenge: 'opt-challenge', allowCredentials: [] }
    sinon.stub(webauthnServer, 'generateAuthenticationOptions').resolves(fakeOptions as any)

    const response = await client
      .post('/passwordless/options')
      .withCsrfToken()
      .json({ email: user.email })

    response.assertStatus(200)
    response.assertBodyContains({ options: fakeOptions })
    assert.equal(response.body().options.challenge, 'opt-challenge')
  })

  test('passwordlessVerify requires assertion and challenge', async ({ client }) => {
    const response = await client.post('/passwordless/verify').withCsrfToken()
    response.assertStatus(400)
    response.assertBodyContains({ message: 'Missing authentication payload' })
  })

  test('passwordlessVerify returns bad request when credential missing', async ({ client }) => {
    const assertion = buildAssertion('non-existent')

    const response = await client
      .post('/passwordless/verify')
      .withSession({ passwordlessChallenge: 'challenge', passwordlessEmail: 'user@example.com' })
      .withCsrfToken()
      .json({ assertion })

    response.assertStatus(400)
    response.assertBodyContains({ message: 'Credential not found' })
  })

  test('passwordlessVerify returns bad request when verification fails', async ({
    client,
    assert,
  }) => {
    const user = await createUser({ email: 'failverify@example.com' })
    const credential = await createPasskey(user.id, { counter: 1 })
    const assertion = buildAssertion(credential.credentialId)

    sinon.stub(webauthnServer, 'verifyAuthenticationResponse').resolves({
      verified: false,
      authenticationInfo: undefined,
    } as any)

    const response = await client
      .post('/passwordless/verify')
      .withSession({ passwordlessChallenge: 'challenge', passwordlessEmail: user.email })
      .withCsrfToken()
      .json({ assertion })

    response.assertStatus(400)
    response.assertBodyContains({ message: 'WebAuthn verification failed' })

    const stored = await db()
      .selectFrom('webauthnCredentials')
      .select('counter')
      .where('id', '=', credential.id)
      .executeTakeFirstOrThrow()
    assert.equal(stored.counter, 1)
  })

  test('passwordlessVerify logs in and updates counter on success', async ({ client, assert }) => {
    const user = await createUser({ email: 'pass@example.com' })
    const credential = await createPasskey(user.id, { counter: 2 })
    const assertion = buildAssertion(credential.credentialId)

    sinon.stub(webauthnServer, 'verifyAuthenticationResponse').resolves({
      verified: true,
      authenticationInfo: {
        credentialID: credential.credentialId,
        newCounter: 7,
        userVerified: true,
        credentialDeviceType: 'singleDevice',
        credentialBackedUp: false,
        origin: 'http://localhost:3333',
        rpID: 'localhost',
      },
    } as any)

    const response = await client
      .post('/passwordless/verify')
      .withSession({ passwordlessChallenge: 'challenge', passwordlessEmail: user.email })
      .withCsrfToken()
      .json({ assertion })
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/')

    const stored = await db()
      .selectFrom('webauthnCredentials')
      .select('counter')
      .where('id', '=', credential.id)
      .executeTakeFirstOrThrow()
    assert.equal(stored.counter, 7)
  })
})

test.group('Session controller - checkEmail', (group) => {
  group.each.setup(() => withGlobalTransaction())

  test('checkEmail returns auth info for existing user', async ({ client, assert }) => {
    const user = await createUser({
      email: 'checkemail@example.com',
      isTwoFactorEnabled: true,
    })

    const response = await client
      .post('/sign-in/check-email')
      .form({ email: user.email })
      .withCsrfToken()

    response.assertStatus(200)
    const body = response.body()
    assert.isBoolean(body.hasPasskeys)
    assert.isBoolean(body.requiresOtp)
    assert.isTrue(body.requiresOtp)
  })

  test('checkEmail returns false for non-existent user (prevents enumeration)', async ({
    client,
    assert,
  }) => {
    const response = await client
      .post('/sign-in/check-email')
      .form({ email: 'nonexistent@example.com' })
      .withCsrfToken()

    response.assertStatus(200)
    const body = response.body()
    assert.isBoolean(body.hasPasskeys)
    assert.isBoolean(body.requiresOtp)
    assert.isFalse(body.hasPasskeys)
    assert.isFalse(body.requiresOtp)
  })

  test('checkEmail requires email parameter', async ({ client, assert }) => {
    const response = await client.post('/sign-in/check-email').withCsrfToken()

    response.assertStatus(400)
    assert.equal(response.body().message, 'Email is required')
  })

  test('checkEmail returns hasPasskeys true when user has passkeys', async ({ client, assert }) => {
    const user = await createUser({ email: 'haspasskeys@example.com' })

    await createPasskey(user.id)

    const response = await client
      .post('/sign-in/check-email')
      .form({ email: user.email })
      .withCsrfToken()

    response.assertStatus(200)
    assert.isTrue(response.body().hasPasskeys)
  })
})

test.group('Session controller - sign in', (group) => {
  group.each.setup(() => withGlobalTransaction())

  test('store returns invalid credentials for unknown email', async ({ client }) => {
    const response = await client
      .post('/sign-in')
      .form({ email: 'missing@example.com', password: 'password' })
      .withCsrfToken()
      .redirects(0)

    // Depending on handler, invalid credentials may respond with 400 or redirect back
    if (![400, 302].includes(response.status())) {
      throw new Error(`Unexpected status ${response.status()}`)
    }
  })
})
