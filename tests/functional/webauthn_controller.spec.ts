import { test } from '@japa/runner'
import sinon from 'sinon'
import { withGlobalTransaction, db } from '#services/db'
import { createUser } from '#tests/support/factories/user'
import { webauthnServer } from '#services/webauthn_server'
import { Insertable, sql } from 'kysely'
import type { WebauthnCredentials } from '#database/types'

// Helper to create a valid security confirmation timestamp for tests
const validSecurityConfirmation = () => Date.now()

async function createPasskey(
  userId: number,
  overrides: Partial<Insertable<WebauthnCredentials>> = {}
) {
  const defaultCredentialId = Buffer.from('passkey').toString('base64url')
  return db()
    .insertInto('webauthnCredentials')
    .values({
      userId,
      credentialId: overrides.credentialId ?? defaultCredentialId,
      publicKey: overrides.publicKey ?? Buffer.from('public-key').toString('base64url'),
      counter: overrides.counter ?? 0,
      friendlyName: overrides.friendlyName ?? 'Test Key',
      transports:
        'transports' in overrides ? overrides.transports : (sql`cast('["usb"]' as jsonb)` as any),
    })
    .returningAll()
    .executeTakeFirstOrThrow()
}

test.group('WebauthnController', (group) => {
  group.each.setup(() => withGlobalTransaction())
  group.each.teardown(() => sinon.restore())

  test('registerOptions requires security confirmation', async ({ client }) => {
    const user = await createUser()

    const response = await client
      .post('/2fa/webauthn/register/options')
      .loginAs(user)
      .withCsrfToken()

    response.assertStatus(401)
    response.assertBodyContains({
      message: 'Security confirmation required to add passkeys',
    })
  })

  test('registerOptions requires twoFactorPassed when 2FA enabled', async ({ client }) => {
    const user = await createUser({ isTwoFactorEnabled: true })

    const response = await client
      .post('/2fa/webauthn/register/options')
      .loginAs(user)
      .withSession({ securityConfirmation: validSecurityConfirmation(), twoFactorPassed: false })
      .withCsrfToken()

    response.assertStatus(401)
    response.assertBodyContains({
      message: 'Two-factor authentication required to add WebAuthn',
    })
  })

  test('registerOptions returns options when authorized', async ({ client }) => {
    const user = await createUser({ isTwoFactorEnabled: true })
    const fakeOptions = { challenge: 'reg-challenge', excludeCredentials: [{ id: 'existing' }] }
    sinon.stub(webauthnServer, 'generateRegistrationOptions').resolves(fakeOptions as any)

    const response = await client
      .post('/2fa/webauthn/register/options')
      .loginAs(user)
      .withSession({ securityConfirmation: validSecurityConfirmation(), twoFactorPassed: true })
      .withCsrfToken()

    response.assertStatus(200)
    response.assertBodyContains({ options: fakeOptions })
  })

  test('registerOptions excludes existing credentials', async ({ client }) => {
    const user = await createUser({ isTwoFactorEnabled: true })
    const credential = await createPasskey(user.id)
    const fakeOptions = { challenge: 'reg-challenge', excludeCredentials: [] }
    const stub = sinon
      .stub(webauthnServer, 'generateRegistrationOptions')
      .resolves(fakeOptions as any)

    const response = await client
      .post('/2fa/webauthn/register/options')
      .loginAs(user)
      .withSession({ securityConfirmation: validSecurityConfirmation(), twoFactorPassed: true })
      .withCsrfToken()

    response.assertStatus(200)
    sinon.assert.calledWithMatch(stub, sinon.match.has('excludeCredentials', sinon.match.array))
    const callArgs = stub.firstCall.args[0] as any
    const excludeIds = callArgs.excludeCredentials.map((c: any) => c.id)
    if (!excludeIds.includes(credential.credentialId)) {
      throw new Error('existing credential not excluded')
    }
  })

  test('authenticationOptions returns bad request when no credentials', async ({ client }) => {
    const user = await createUser()

    const response = await client
      .post('/2fa/webauthn/authenticate/options')
      .loginAs(user)
      .withCsrfToken()

    response.assertStatus(400)
    response.assertBodyContains({ message: 'No security keys registered' })
  })

  test('authenticationOptions returns options when credentials exist', async ({ client }) => {
    const user = await createUser()
    await createPasskey(user.id)
    const fakeOptions = { challenge: 'auth-challenge', allowCredentials: [] }
    sinon.stub(webauthnServer, 'generateAuthenticationOptions').resolves(fakeOptions as any)

    const response = await client
      .post('/2fa/webauthn/authenticate/options')
      .loginAs(user)
      .withCsrfToken()

    response.assertStatus(200)
    response.assertBodyContains({ options: fakeOptions })
  })

  test('verifyAuthentication returns bad request when payload missing', async ({ client }) => {
    const user = await createUser()

    const response = await client
      .post('/2fa/webauthn/authenticate/verify')
      .loginAs(user)
      .withCsrfToken()

    response.assertStatus(400)
    response.assertBodyContains({ message: 'Missing authentication payload' })
  })

  test('verifyAuthentication returns bad request when credential missing', async ({ client }) => {
    const user = await createUser()
    const assertion = { id: 'missing', rawId: 'missing', response: {}, type: 'public-key' }

    const response = await client
      .post('/2fa/webauthn/authenticate/verify')
      .loginAs(user)
      .withSession({ webauthnAuthenticationChallenge: 'challenge' })
      .withCsrfToken()
      .json({ assertion })

    response.assertStatus(400)
    response.assertBodyContains({ message: 'Credential not found' })
  })

  test('verifyAuthentication returns bad request when verification fails', async ({
    client,
    assert,
  }) => {
    const user = await createUser()
    const credential = await createPasskey(user.id, { counter: 1 })
    const assertion = {
      id: credential.credentialId,
      rawId: credential.credentialId,
      response: {},
      type: 'public-key',
    }
    sinon.stub(webauthnServer, 'verifyAuthenticationResponse').resolves({
      verified: false,
      authenticationInfo: undefined,
    } as any)

    const response = await client
      .post('/2fa/webauthn/authenticate/verify')
      .loginAs(user)
      .withSession({ webauthnAuthenticationChallenge: 'challenge' })
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

  test('verifyAuthentication updates counter and marks passed on success', async ({
    client,
    assert,
  }) => {
    const user = await createUser()
    const credential = await createPasskey(user.id, { counter: 1 })
    const assertion = {
      id: credential.credentialId,
      rawId: credential.credentialId,
      response: {},
      type: 'public-key',
    }
    sinon.stub(webauthnServer, 'verifyAuthenticationResponse').resolves({
      verified: true,
      authenticationInfo: {
        newCounter: 5,
        credentialID: credential.credentialId,
        userVerified: true,
        credentialDeviceType: 'singleDevice',
        credentialBackedUp: false,
        origin: 'http://localhost:3333',
        rpID: 'localhost',
      },
    } as any)

    const response = await client
      .post('/2fa/webauthn/authenticate/verify')
      .loginAs(user)
      .withSession({ webauthnAuthenticationChallenge: 'challenge' })
      .withCsrfToken()
      .json({ assertion })

    response.assertStatus(200)
    response.assertBodyContains({ verified: true })

    const stored = await db()
      .selectFrom('webauthnCredentials')
      .select('counter')
      .where('id', '=', credential.id)
      .executeTakeFirstOrThrow()
    assert.equal(stored.counter, 5)
  })

  test('verifyRegistration returns bad request when payload missing', async ({ client }) => {
    const user = await createUser()

    const response = await client
      .post('/2fa/webauthn/register/verify')
      .loginAs(user)
      .withSession({
        webauthnRegistrationChallenge: 'challenge',
        securityConfirmation: validSecurityConfirmation(),
      })
      .withCsrfToken()

    response.assertStatus(400)
    response.assertBodyContains({ message: 'Missing registration payload' })
  })

  test('verifyRegistration requires security confirmation', async ({ client }) => {
    const user = await createUser()
    const attestation = {
      id: 'att-id',
      rawId: 'att-raw',
      response: { clientDataJSON: '', attestationObject: '' },
      type: 'public-key',
    }

    const response = await client
      .post('/2fa/webauthn/register/verify')
      .loginAs(user)
      .withSession({ webauthnRegistrationChallenge: 'challenge' })
      .withCsrfToken()
      .json({ attestation })

    response.assertStatus(401)
    response.assertBodyContains({ message: 'Security confirmation required to add passkeys' })
  })

  test('verifyRegistration returns bad request when verification fails', async ({ client }) => {
    const user = await createUser()
    const attestation = {
      id: 'att-id',
      rawId: 'att-raw',
      response: { clientDataJSON: '', attestationObject: '' },
      type: 'public-key',
    }
    sinon.stub(webauthnServer, 'verifyRegistrationResponse').resolves({
      verified: false,
      registrationInfo: undefined,
    } as any)

    const response = await client
      .post('/2fa/webauthn/register/verify')
      .loginAs(user)
      .withSession({
        webauthnRegistrationChallenge: 'challenge',
        securityConfirmation: validSecurityConfirmation(),
      })
      .withCsrfToken()
      .json({ attestation })

    response.assertStatus(400)
    response.assertBodyContains({ message: 'WebAuthn verification failed' })
  })

  test('verifyRegistration stores credential on success', async ({ client, assert }) => {
    const user = await createUser()
    const attestation = {
      id: 'att-id',
      rawId: 'att-raw',
      response: {
        clientDataJSON: '',
        attestationObject: '',
        transports: ['usb'],
      },
      type: 'public-key',
    }
    sinon.stub(webauthnServer, 'verifyRegistrationResponse').resolves({
      verified: true,
      registrationInfo: {
        credential: {
          id: 'cred-id',
          publicKey: Buffer.from('pub').buffer,
          counter: 3,
        },
        credentialDeviceType: 'singleDevice',
        credentialBackedUp: false,
      },
    } as any)

    const response = await client
      .post('/2fa/webauthn/register/verify')
      .loginAs(user)
      .withSession({
        webauthnRegistrationChallenge: 'challenge',
        securityConfirmation: validSecurityConfirmation(),
      })
      .withCsrfToken()
      .json({ attestation, friendlyName: 'My Key' })

    response.assertStatus(200)
    response.assertBodyContains({ verified: true })

    const stored = await db()
      .selectFrom('webauthnCredentials')
      .select(['credentialId', 'counter', 'friendlyName'])
      .where('userId', '=', user.id)
      .executeTakeFirstOrThrow()
    assert.equal(stored.credentialId, 'cred-id')
    assert.equal(stored.counter, 3)
    assert.equal(stored.friendlyName, 'My Key')
  })

  test('verifyRegistration stores credential with transports and no friendlyName', async ({
    client,
    assert,
  }) => {
    const user = await createUser()
    const attestation = {
      id: 'att-id-2',
      rawId: 'att-raw-2',
      response: {
        clientDataJSON: '',
        attestationObject: '',
        transports: ['nfc'],
      },
      type: 'public-key',
    }
    sinon.stub(webauthnServer, 'verifyRegistrationResponse').resolves({
      verified: true,
      registrationInfo: {
        credential: {
          id: 'cred-id-2',
          publicKey: new Uint8Array([1, 2, 3]).buffer,
          counter: 1,
        },
        credentialDeviceType: 'singleDevice',
        credentialBackedUp: true,
      },
    } as any)

    const response = await client
      .post('/2fa/webauthn/register/verify')
      .loginAs(user)
      .withSession({
        webauthnRegistrationChallenge: 'challenge',
        securityConfirmation: validSecurityConfirmation(),
      })
      .withCsrfToken()
      .json({ attestation })

    response.assertStatus(200)
    response.assertBodyContains({ verified: true })

    const stored = await db()
      .selectFrom('webauthnCredentials')
      .select(['credentialId', 'counter', 'friendlyName', 'transports'])
      .where('userId', '=', user.id)
      .where('credentialId', '=', 'cred-id-2')
      .executeTakeFirstOrThrow()
    assert.equal(stored.credentialId, 'cred-id-2')
    assert.equal(stored.counter, 1)
    assert.isNull(stored.friendlyName)
    assert.deepEqual(stored.transports, ['nfc'])
  })

  test('verifyRegistration defaults transports to empty array when not provided', async ({
    client,
    assert,
  }) => {
    const user = await createUser()
    const attestation = {
      id: 'att-id-3',
      rawId: 'att-raw-3',
      response: {
        clientDataJSON: '',
        attestationObject: '',
      },
      type: 'public-key',
    }
    sinon.stub(webauthnServer, 'verifyRegistrationResponse').resolves({
      verified: true,
      registrationInfo: {
        credential: {
          id: 'cred-id-3',
          publicKey: new Uint8Array([4, 5, 6]).buffer,
          counter: 2,
        },
        credentialDeviceType: 'singleDevice',
        credentialBackedUp: false,
      },
    } as any)

    const response = await client
      .post('/2fa/webauthn/register/verify')
      .loginAs(user)
      .withSession({
        webauthnRegistrationChallenge: 'challenge',
        securityConfirmation: validSecurityConfirmation(),
      })
      .withCsrfToken()
      .json({ attestation })

    response.assertStatus(200)
    response.assertBodyContains({ verified: true })

    const stored = await db()
      .selectFrom('webauthnCredentials')
      .select(['credentialId', 'counter', 'friendlyName', 'transports'])
      .where('userId', '=', user.id)
      .where('credentialId', '=', 'cred-id-3')
      .executeTakeFirstOrThrow()
    assert.equal(stored.credentialId, 'cred-id-3')
    assert.equal(stored.counter, 2)
    assert.isNull(stored.friendlyName)
    assert.deepEqual(stored.transports, [])
  })
})
