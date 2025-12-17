import { test } from '@japa/runner'
import { withGlobalTransaction } from '#services/db'
import { createUser } from '#tests/support/factories/user'

test.group('TwoFactorMiddleware', (group) => {
  group.each.setup(() => withGlobalTransaction())

  test('allows guest to proceed', async ({ client }) => {
    const response = await client.get('/').withCsrfToken().redirects(0)
    response.assertStatus(200)
  })

  test('allows 2fa routes without redirect', async ({ client }) => {
    const user = await createUser({ isTwoFactorEnabled: true })
    const response = await client.get('/2fa/challenge').loginAs(user).redirects(0)
    response.assertStatus(200)
  })

  test('allows when twoFactorPassed is set', async ({ client }) => {
    const user = await createUser({ isTwoFactorEnabled: true })
    const response = await client
      .get('/users')
      .loginAs(user)
      .withSession({ twoFactorPassed: true })
      .redirects(0)
    response.assertStatus(200)
  })

  test('redirects to challenge when 2FA required and not passed', async ({ client }) => {
    const user = await createUser({ isTwoFactorEnabled: true })
    const response = await client.get('/users').loginAs(user).redirects(0)
    response.assertStatus(302)
    response.assertHeader('location', '/2fa/challenge')
  })
})
