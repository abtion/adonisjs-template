import {
  appendPermissionsToRecord,
  appendPermissionsToRecords,
} from '#middleware/permissions_middleware'
import { BasePolicy, Bouncer } from '@adonisjs/bouncer'
import { test } from '@japa/runner'
import { policies } from '#policies/main'
import { SessionUser } from '../../app/auth_providers/session_user_provider.js'
import { PolicyUser } from '#policies/user_policy'
import { AuthorizerResponse } from '@adonisjs/bouncer/types'

class TestPolicy extends BasePolicy {
  show(user: SessionUser, targetUser: PolicyUser): AuthorizerResponse {
    return user.admin || user.id === targetUser.id
  }

  edit(user: SessionUser, targetUser: PolicyUser): AuthorizerResponse {
    return user.admin || user.id === targetUser.id
  }

  destroy(user: SessionUser, targetUser: PolicyUser): AuthorizerResponse {
    return user.admin || user.id === targetUser.id
  }
}

test.group('Permissions middleware', async () => {
  let user = { admin: false, id: 1 }
  let bouncer = new Bouncer(() => user as SessionUser, {}, policies)

  test('appendPermissionsToRecord appends default permissions when no actions are specified', async ({
    assert,
  }) => {
    const otherUser = { id: 2 }
    const { permissions } = await appendPermissionsToRecord(bouncer, otherUser, TestPolicy)

    assert.deepEqual(Object.keys(permissions), ['show', 'edit', 'destroy'])
    assert.equal(permissions.show, await bouncer.with(TestPolicy).allows('show', otherUser))
    assert.equal(permissions.edit, await bouncer.with(TestPolicy).allows('edit', otherUser))
    assert.equal(permissions.destroy, await bouncer.with(TestPolicy).allows('destroy', otherUser))
  })

  test('appendPermissionsToRecord appends default permissions when no actions are specified', async ({
    assert,
  }) => {
    const otherUser = { id: 2 }
    const { permissions } = await appendPermissionsToRecord(bouncer, otherUser, TestPolicy, [
      'show',
      'edit',
    ])

    assert.deepEqual(Object.keys(permissions), ['show', 'edit'])
    assert.equal(permissions.show, await bouncer.with(TestPolicy).allows('show', otherUser))
    assert.equal(permissions.edit, await bouncer.with(TestPolicy).allows('edit', otherUser))
  })

  test('appendPermissionsToRecords appends default permissions when no actions are specified', async ({
    assert,
  }) => {
    const otherUsers = [user, { id: 2 }]
    const usersWithPermissions = await appendPermissionsToRecords(bouncer, otherUsers, TestPolicy)

    const perms0 = usersWithPermissions[0].permissions
    assert.deepEqual(Object.keys(perms0), ['show', 'edit', 'destroy'])
    assert.equal(perms0.show, await bouncer.with(TestPolicy).allows('show', otherUsers[0]))
    assert.equal(perms0.edit, await bouncer.with(TestPolicy).allows('edit', otherUsers[0]))
    assert.equal(perms0.destroy, await bouncer.with(TestPolicy).allows('destroy', otherUsers[0]))

    const perms1 = usersWithPermissions[1].permissions
    assert.deepEqual(Object.keys(perms0), ['show', 'edit', 'destroy'])
    assert.equal(perms1.show, await bouncer.with(TestPolicy).allows('show', otherUsers[1]))
    assert.equal(perms1.edit, await bouncer.with(TestPolicy).allows('edit', otherUsers[1]))
    assert.equal(perms1.destroy, await bouncer.with(TestPolicy).allows('destroy', otherUsers[1]))
  })

  test('appendPermissionsToRecords appends default permissions when no actions are specified', async ({
    assert,
  }) => {
    const otherUsers = [user, { id: 2 }]
    const usersWithPermissions = await appendPermissionsToRecords(bouncer, otherUsers, TestPolicy, [
      'edit',
      'destroy',
    ])

    const perms0 = usersWithPermissions[0].permissions
    assert.deepEqual(Object.keys(perms0), ['edit', 'destroy'])
    assert.equal(perms0.edit, await bouncer.with(TestPolicy).allows('edit', otherUsers[0]))
    assert.equal(perms0.destroy, await bouncer.with(TestPolicy).allows('destroy', otherUsers[0]))

    const perms1 = usersWithPermissions[1].permissions
    assert.deepEqual(Object.keys(perms0), ['edit', 'destroy'])
    assert.equal(perms1.edit, await bouncer.with(TestPolicy).allows('edit', otherUsers[1]))
    assert.equal(perms1.destroy, await bouncer.with(TestPolicy).allows('destroy', otherUsers[1]))
  })

  test('appendPermissionsToRecord raises error if default permissions does not exist', async ({
    assert,
  }) => {
    class TestPolicyMissingActions extends BasePolicy {}

    const otherUser = { id: 2 }
    assert.rejects(
      () => appendPermissionsToRecord(bouncer, otherUser, TestPolicyMissingActions),
      'TestPolicyMissingActions does not have the action "show"'
    )
  })
})
