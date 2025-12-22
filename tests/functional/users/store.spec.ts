import { test } from '@japa/runner'
import { withGlobalTransaction, db } from '#services/db'
import { createUser } from '#tests/support/factories/user'
import hash from '@adonisjs/core/services/hash'

test.group('Users store', (group) => {
  group.each.setup(() => withGlobalTransaction())

  test('store creates a new user', async ({ client, assert }) => {
    const admin = await createUser({ admin: true })
    const newUserData = {
      name: 'New User',
      email: 'newuser@example.com',
      password: 'securepassword123',
    }

    const response = await client
      .post('/users')
      .form(newUserData)
      .loginAs(admin)
      .withCsrfToken()
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/users')

    const createdUser = await db()
      .selectFrom('users')
      .where('email', '=', newUserData.email)
      .selectAll()
      .executeTakeFirstOrThrow()

    assert.equal(createdUser.name, newUserData.name)
    assert.equal(createdUser.email, newUserData.email)
    assert.isNotNull(createdUser.password)
    assert.isTrue(await hash.verify(createdUser.password!, newUserData.password))
  })
})
