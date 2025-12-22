import { test } from '@japa/runner'
import { withGlobalTransaction } from '#services/db'
import { createUser } from '#tests/support/factories/user'

test.group('Users edit', (group) => {
  group.each.setup(() => withGlobalTransaction())

  test('edit renders edit form for admin', async ({ client }) => {
    const admin = await createUser({ admin: true })
    const targetUser = await createUser({ email: 'target@example.com', name: 'Target User' })

    const response = await client.get(`/users/${targetUser.id}/edit`).withInertia().loginAs(admin)

    response.assertStatus(200)
    response.assertBodyContains({
      component: 'users/edit',
      props: {
        user: {
          id: targetUser.id,
          email: targetUser.email,
          name: targetUser.name,
        },
      },
    })
  })

  test('edit renders edit form for own user', async ({ client }) => {
    const user = await createUser({ admin: false, email: 'self@example.com', name: 'Self User' })

    const response = await client.get(`/users/${user.id}/edit`).withInertia().loginAs(user)

    response.assertStatus(200)
    response.assertBodyContains({
      component: 'users/edit',
      props: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      },
    })
  })
})
