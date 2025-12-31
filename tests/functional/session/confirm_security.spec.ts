import { test } from '@japa/runner'
import { withGlobalTransaction } from '#services/db'
import { createUser } from '#tests/support/factories/user'
import hash from '@adonisjs/core/services/hash'

test.group('Session Confirm Security', (group) => {
  group.each.setup(() => withGlobalTransaction())

  test('store throws error when webauthn assertion is provided without challenge in session', async ({
    client,
  }) => {
    const user = await createUser()

    const response = await client
      .post('/session/confirm-security')
      .json({
        assertion: {
          id: 'test-credential-id',
          rawId: 'test-raw-id',
          type: 'public-key',
          response: {
            clientDataJSON: 'test',
            authenticatorData: 'test',
            signature: 'test',
          },
        },
      })
      .withCsrfToken()
      .loginAs(user)

    response.assertStatus(422)
    response.assertBodyContains({ message: 'errors.missingAuthenticationPayload' })
  })

  test('store throws error when password is incorrect', async ({ client }) => {
    const user = await createUser({
      password: await hash.make('correct-password'),
    })

    const response = await client
      .post('/session/confirm-security')
      .json({ password: 'wrong-password' })
      .withCsrfToken()
      .loginAs(user)

    response.assertStatus(422)
    response.assertBodyContains({ message: 'errors.verificationFailed' })
  })

  test('store throws validation error when neither password nor assertion is provided', async ({
    client,
  }) => {
    const user = await createUser()

    const response = await client
      .post('/session/confirm-security')
      .json({})
      .accept('application/json')
      .withCsrfToken()
      .loginAs(user)

    response.assertStatus(422)
  })
})
