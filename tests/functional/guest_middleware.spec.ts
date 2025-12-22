import { test } from '@japa/runner'
import { withGlobalTransaction } from '#services/db'
import { createUser } from '#tests/support/factories/user'

test.group('Guest middleware', (group) => {
  group.each.setup(() => withGlobalTransaction())

  test('redirects authenticated user to home', async ({ client }) => {
    const user = await createUser()

    const response = await client.get('/sign-in').loginAs(user).redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/')
  })

  test('allows unauthenticated user to access sign-in', async ({ client }) => {
    const response = await client.get('/sign-in').withInertia()

    response.assertStatus(200)
    response.assertBodyContains({
      component: 'session/signIn',
    })
  })
})
