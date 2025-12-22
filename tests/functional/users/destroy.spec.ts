import { test } from '@japa/runner'
import { withGlobalTransaction, db } from '#services/db'
import { createUser } from '#tests/support/factories/user'

test.group('Users destroy', (group) => {
  group.each.setup(() => withGlobalTransaction())

  test('destroy deletes user for admin', async ({ client, assert }) => {
    const admin = await createUser({ admin: true })
    const targetUser = await createUser({ email: 'todelete@example.com' })

    const response = await client
      .delete(`/users/${targetUser.id}`)
      .loginAs(admin)
      .withCsrfToken()
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/users')

    const deletedUser = await db()
      .selectFrom('users')
      .where('id', '=', targetUser.id)
      .select('id')
      .executeTakeFirst()

    assert.isUndefined(deletedUser)
  })

  test('destroy allows user to delete themselves', async ({ client, assert }) => {
    const user = await createUser({ admin: false, email: 'selfdelete@example.com' })

    const response = await client
      .delete(`/users/${user.id}`)
      .loginAs(user)
      .withCsrfToken()
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/users')

    const deletedUser = await db()
      .selectFrom('users')
      .where('id', '=', user.id)
      .select('id')
      .executeTakeFirst()

    assert.isUndefined(deletedUser)
  })
})
