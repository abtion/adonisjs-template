import { test } from '@japa/runner'
import { withGlobalTransaction } from '#services/db'
import { createUser } from '#tests/support/factories/user'
import hash from '@adonisjs/core/services/hash'
import { db } from '#services/db'

test.group('Users update', (group) => {
  group.each.setup(() => withGlobalTransaction())

  test('password is hashed when updated', async ({ client, assert }) => {
    const user = await createUser({ admin: true })
    const newPassword = 'new-secure-password'

    await client
      .patch(`/users/${user.id}`)
      .json({
        email: user.email,
        name: user.name,
        password: newPassword,
      })
      .loginAs(user)
      .withCsrfToken()

    const updatedUser = await db()
      .selectFrom('users')
      .where('id', '=', user.id)
      .select('password')
      .executeTakeFirstOrThrow()

    assert.isNotNull(updatedUser.password)
    assert.isTrue(await hash.verify(updatedUser.password!, newPassword))
    assert.notEqual(updatedUser.password, newPassword)
  })
})
