import { test } from '@japa/runner'
import { db, withGlobalTransaction } from '#services/db'
import { createUser } from '#tests/support/factories/user'

test.group('Users list', (group) => {
  group.each.setup(() => withGlobalTransaction())

  test('get a list of users', async ({ client }) => {
    const user = await createUser({ admin: true })

    const response = await client.get('/users').withInertia().loginAs(user)

    response.assertStatus(200)
    response.assertBodyContains({
      props: {
        users: [
          {
            id: user?.id,
            name: user?.name,
            email: user?.email,
          },
        ],
      },
    })
  })
})
