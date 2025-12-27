import { test } from '@japa/runner'
import UserPolicy from '#policies/user_policy'

test.group('User policy', () => {
  test('it grants access when user is admin', ({ assert }) => {
    const sessionUser = { admin: true, id: 1, name: '', email: '' }
    const targetUser = { id: 2 }
    const policy = new UserPolicy()

    assert.isTrue(policy.index(sessionUser))
    assert.isTrue(policy.create(sessionUser))
    assert.isTrue(policy.show(sessionUser, targetUser))
    assert.isTrue(policy.edit(sessionUser, targetUser))
    assert.isTrue(policy.destroy(sessionUser, targetUser))
  })

  test('it denies access to index and create when user not admin', ({ assert }) => {
    const sessionUser = { admin: false, id: 1, name: '', email: '' }
    const policy = new UserPolicy()

    assert.isFalse(policy.index(sessionUser))
    assert.isFalse(policy.create(sessionUser))
  })

  test('it grants non-admins access to see, edit and delete themselves', ({ assert }) => {
    const sessionUser = { admin: false, id: 1, name: '', email: '' }
    const targetUser = sessionUser
    const policy = new UserPolicy()

    assert.isTrue(policy.show(sessionUser, targetUser))
    assert.isTrue(policy.edit(sessionUser, targetUser))
    assert.isTrue(policy.destroy(sessionUser, targetUser))
  })

  test('it denies non-admins access to see, edit and delete other users', ({ assert }) => {
    const sessionUser = { admin: false, id: 1, name: '', email: '' }
    const targetUser = { id: 2 }
    const policy = new UserPolicy()

    assert.isFalse(policy.show(sessionUser, targetUser))
    assert.isFalse(policy.edit(sessionUser, targetUser))
    assert.isFalse(policy.destroy(sessionUser, targetUser))
  })
})
