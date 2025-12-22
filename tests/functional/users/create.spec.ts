import { test } from '@japa/runner'
import { withGlobalTransaction } from '#services/db'
import { createUser } from '#tests/support/factories/user'

test.group('Users create', (group) => {
  group.each.setup(() => withGlobalTransaction())

  test('create renders create form', async ({ client }) => {
    const user = await createUser({ admin: true })

    const response = await client.get('/users/create').withInertia().loginAs(user)

    response.assertStatus(200)
    response.assertBodyContains({
      component: 'users/create',
    })
  })
})
