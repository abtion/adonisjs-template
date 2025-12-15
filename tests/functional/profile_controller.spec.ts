import { test } from '@japa/runner'
import sinon from 'sinon'
import { withGlobalTransaction, db } from '#services/db'
import { createUser } from '#tests/support/factories/user'
import ProfileController from '#controllers/profile_controller'
import twoFactorAuth from '@nulix/adonis-2fa/services/main'
import { webauthnServer } from '#services/webauthn_server'
import {
  SECURITY_CONFIRMATION_CHALLENGE_KEY,
  SECURITY_CONFIRMATION_KEY,
} from '#services/two_factor'
import type { WebauthnCredentials } from '#database/types'
import { HttpContext } from '@adonisjs/core/http'
import { Insertable } from 'kysely'

async function createPasskey(
  userId: number,
  overrides: Partial<Insertable<WebauthnCredentials>> = {}
) {
  const defaultCredentialId = Buffer.from('test-credential-id').toString('base64url')
  return db()
    .insertInto('webauthnCredentials')
    .values({
      userId,
      credentialId: overrides.credentialId ?? defaultCredentialId,
      publicKey: overrides.publicKey ?? Buffer.from('public-key').toString('base64url'),
      friendlyName: overrides.friendlyName ?? 'Laptop key',
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

test.group('Profile controller', (group) => {
  group.each.setup(() => withGlobalTransaction())

  test('shows profile with passkeys and recovery codes', async ({ client }) => {
    const user = await createUser({ twoFactorRecoveryCodes: ['a', 'b'] })
    const credential = await createPasskey(user.id)

    const response = await client.get('/profile').withInertia().loginAs(user)

    response.assertStatus(200)
    response.assertBodyContains({
      props: {
        user: { name: user.name, email: user.email },
        twoFactor: {
          enabled: user.isTwoFactorEnabled,
          hasWebauthn: true,
          recoveryCodesCount: 2,
        },
        passkeys: [
          {
            id: credential.id,
            friendlyName: credential.friendlyName,
          },
        ],
      },
    })
  })

  test('confirmSecurity rejects when no credentials are provided', async ({ client }) => {
    const user = await createUser()

    const response = await client
      .post('/profile/confirm-security')
      .loginAs(user)
      .withCsrfToken()
      .json({})

    response.assertStatus(400)
    response.assertBodyContains({ message: 'Password or passkey assertion required' })
  })

  test('confirmSecurity rejects invalid password', async ({ client }) => {
    const user = await createUser()

    const response = await client
      .post('/profile/confirm-security')
      .loginAs(user)
      .withCsrfToken()
      .json({ password: 'wrong-password' })

    response.assertStatus(401)
    response.assertBodyContains({ message: 'Invalid password' })
  })

  test('confirmSecurity accepts valid password and marks confirmation', async ({ client }) => {
    const user = await createUser()

    const response = await client
      .post('/profile/confirm-security')
      .loginAs(user)
      .withCsrfToken()
      .json({ password: 'password' })

    response.assertStatus(200)
    response.assertBodyContains({ confirmed: true })
  })

  test('confirmSecurity fails when credential does not exist', async ({ client }) => {
    const user = await createUser()
    const challenge = 'challenge-123'

    const response = await client
      .post('/profile/confirm-security')
      .loginAs(user)
      .withSession({ [SECURITY_CONFIRMATION_CHALLENGE_KEY]: challenge })
      .withCsrfToken()
      .json({ assertion: buildAssertion('missing') })

    response.assertStatus(400)
    response.assertBodyContains({ message: 'Credential not found' })
  })

  test('confirmSecurity returns error when passkey verification fails', async ({
    client,
    assert,
  }) => {
    const user = await createUser()
    const credential = await createPasskey(user.id, { counter: 1 })
    const challenge = 'challenge-456'

    sinon.stub(webauthnServer, 'verifyAuthenticationResponse').resolves({
      verified: false,
      authenticationInfo: undefined,
    } as any)

    const response = await client
      .post('/profile/confirm-security')
      .loginAs(user)
      .withSession({ [SECURITY_CONFIRMATION_CHALLENGE_KEY]: challenge })
      .withCsrfToken()
      .json({ assertion: buildAssertion(credential.credentialId) })

    response.assertStatus(400)

    const stored = await db()
      .selectFrom('webauthnCredentials')
      .select('counter')
      .where('id', '=', credential.id)
      .executeTakeFirstOrThrow()
    assert.equal(stored.counter, 1)
  })

  test('confirmSecurity with passkey requires valid challenge and credential', async ({
    client,
    assert,
  }) => {
    const user = await createUser()
    const credential = await createPasskey(user.id, { counter: 1 })
    const challenge = 'challenge-789'

    sinon.stub(webauthnServer, 'verifyAuthenticationResponse').resolves({
      verified: true,
      authenticationInfo: {
        credentialID: credential.credentialId,
        newCounter: 5,
        userVerified: true,
        credentialDeviceType: 'singleDevice',
        credentialBackedUp: false,
        origin: 'http://localhost:3333',
        rpID: 'localhost',
      },
    } as any)

    const response = await client
      .post('/profile/confirm-security')
      .loginAs(user)
      .withSession({ [SECURITY_CONFIRMATION_CHALLENGE_KEY]: challenge })
      .withCsrfToken()
      .json({ assertion: buildAssertion(credential.credentialId) })

    response.assertStatus(200)
    response.assertBodyContains({ confirmed: true })

    const stored = await db()
      .selectFrom('webauthnCredentials')
      .select('counter')
      .where('id', '=', credential.id)
      .executeTakeFirstOrThrow()
    assert.equal(stored.counter, 5)
  })

  test('confirmSecurity requires challenge when using passkey', async ({ client }) => {
    const user = await createUser()
    const credential = await createPasskey(user.id)

    const response = await client
      .post('/profile/confirm-security')
      .loginAs(user)
      .withCsrfToken()
      .json({ assertion: buildAssertion(credential.credentialId) })

    response.assertStatus(400)
    response.assertBodyContains({
      message: 'Security confirmation challenge not found',
    })
  })

  test('confirmSecurityOptions returns options and detects passkeys', async ({
    client,
    assert,
  }) => {
    const user = await createUser()
    await createPasskey(user.id)

    const response = await client
      .post('/profile/confirm-security/options')
      .loginAs(user)
      .withCsrfToken()

    response.assertStatus(200)
    const body = response.body()
    assert.exists(body.options.challenge)
    assert.isTrue(body.hasPasskeys)
  })

  test('confirmSecurityOptions reports no passkeys', async ({ client, assert }) => {
    const user = await createUser()

    const response = await client
      .post('/profile/confirm-security/options')
      .loginAs(user)
      .withCsrfToken()

    response.assertStatus(200)
    const body = response.body()
    assert.exists(body.options.challenge)
    assert.isFalse(body.hasPasskeys)
  })

  test('enable requires recent security confirmation', async ({ client }) => {
    const user = await createUser()

    const response = await client.post('/profile/enable-mfa').loginAs(user).withCsrfToken()

    response.assertStatus(401)
    response.assertBodyContains({
      message: 'Security confirmation required to modify 2FA settings',
    })
  })

  test('enable rejects when already enabled', async ({ client }) => {
    const user = await createUser({ isTwoFactorEnabled: true })

    const response = await client
      .post('/profile/enable-mfa')
      .loginAs(user)
      .withSession({
        [SECURITY_CONFIRMATION_KEY]: true,
        twoFactorPassed: true,
      })
      .withCsrfToken()

    response.assertStatus(400)
    response.assertBodyContains({ message: 'Two-factor authentication is already enabled' })
  })

  test('enable stores secret and recovery codes', async ({ client, assert }) => {
    const user = await createUser()
    const secret = { secret: 'SECRET', uri: 'otpauth://secret', qr: '' }
    const recoveryCodes = ['code-1', 'code-2']
    sinon.stub(twoFactorAuth, 'generateSecret').resolves(secret as any)
    sinon.stub(twoFactorAuth, 'generateRecoveryCodes').returns(recoveryCodes as any)

    const response = await client
      .post('/profile/enable-mfa')
      .loginAs(user)
      .withSession({ [SECURITY_CONFIRMATION_KEY]: true })
      .withCsrfToken()

    response.assertStatus(200)
    response.assertBodyContains({ secret, recoveryCodes })

    const stored = await db()
      .selectFrom('users')
      .select(['twoFactorSecret', 'twoFactorRecoveryCodes'])
      .where('id', '=', user.id)
      .executeTakeFirstOrThrow()
    assert.deepEqual(stored.twoFactorRecoveryCodes, recoveryCodes)
    assert.deepEqual(stored.twoFactorSecret, secret)
  })

  test('removePasskey requires security confirmation', async ({ client }) => {
    const user = await createUser()
    await createPasskey(user.id)

    const response = await client.delete('/profile/passkeys/1').loginAs(user).withCsrfToken()

    response.assertStatus(401)
    response.assertBodyContains({
      message: 'Security confirmation required to remove passkeys',
    })
  })

  test('removePasskey rejects invalid id', async ({ client }) => {
    const user = await createUser()

    const response = await client
      .delete('/profile/passkeys/not-a-number')
      .loginAs(user)
      .withSession({ [SECURITY_CONFIRMATION_KEY]: true })
      .withCsrfToken()

    response.assertStatus(400)
    response.assertBodyContains({ message: 'Invalid credential ID' })
  })

  test('removePasskey returns not found when credential is missing', async ({ client }) => {
    const user = await createUser()

    const response = await client
      .delete('/profile/passkeys/9999')
      .loginAs(user)
      .withSession({ [SECURITY_CONFIRMATION_KEY]: true })
      .withCsrfToken()

    response.assertStatus(404)
    response.assertBodyContains({ message: 'Passkey not found' })
  })

  test('removePasskey deletes existing credential', async ({ client, assert }) => {
    const user = await createUser()
    const credential = await createPasskey(user.id)

    const response = await client
      .delete(`/profile/passkeys/${credential.id}`)
      .loginAs(user)
      .withSession({ [SECURITY_CONFIRMATION_KEY]: true })
      .withCsrfToken()

    response.assertStatus(200)
    response.assertBodyContains({ message: 'Passkey removed successfully' })

    const stored = await db()
      .selectFrom('webauthnCredentials')
      .selectAll()
      .where('id', '=', credential.id)
      .executeTakeFirst()
    assert.isUndefined(stored)
  })

  test('removePasskey validates missing credential id', async ({ assert }) => {
    const user = await createUser()
    const controller = new ProfileController()
    const badRequest = sinon.fake()

    const ctx = {
      auth: { user },
      request: { param: () => undefined },
      response: { badRequest },
      session: {
        get: (key: string) => (key === SECURITY_CONFIRMATION_KEY ? true : undefined),
      },
    } as unknown as HttpContext

    await controller.removePasskey(ctx)

    sinon.assert.calledWith(badRequest, { message: 'Credential ID is required' })
    assert.isTrue(badRequest.called)
  })
})
