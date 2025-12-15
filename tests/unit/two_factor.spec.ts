import { test } from '@japa/runner'
import {
  parseTwoFactorSecret,
  parseRecoveryCodes,
  loadUserWithTwoFactor,
  parseTransports,
} from '#services/two_factor'
import { withGlobalTransaction } from '#services/db'
import { createUser } from '#tests/support/factories/user'

test.group('two_factor utils', (group) => {
  group.each.setup(() => withGlobalTransaction())

  test('parseTwoFactorSecret parses valid JSON string', async ({ assert }) => {
    const secret = { secret: 'ABC', uri: 'otpauth://abc' }
    const parsed = parseTwoFactorSecret(JSON.stringify(secret))
    assert.deepEqual(parsed, secret)
  })

  test('parseTwoFactorSecret returns null for invalid input', async ({ assert }) => {
    assert.isNull(parseTwoFactorSecret('not-json'))
    assert.isNull(parseTwoFactorSecret(123))
  })

  test('parseRecoveryCodes handles arrays and strings', async ({ assert }) => {
    assert.deepEqual(parseRecoveryCodes(['A', 'B']), ['A', 'B'])
    assert.deepEqual(parseRecoveryCodes('["C","D"]'), ['C', 'D'])
    assert.deepEqual(parseRecoveryCodes('bad-json'), [])
    assert.deepEqual(parseRecoveryCodes(undefined), [])
  })

  test('parseTransports filters invalid transports', async ({ assert }) => {
    assert.deepEqual(parseTransports(['usb', 'nfc']), ['usb', 'nfc'])
    assert.deepEqual(parseTransports(['usb', 'invalid']), ['usb'])
    assert.deepEqual(parseTransports('not-an-array'), [])
    assert.deepEqual(parseTransports(undefined), [])
  })

  test('loadUserWithTwoFactor throws when user missing', async ({ assert }) => {
    await assert.rejects(async () => {
      await loadUserWithTwoFactor(999999)
    }, /User not found/)
  })

  test('loadUserWithTwoFactor loads existing user', async ({ assert }) => {
    const user = await createUser()
    const loaded = await loadUserWithTwoFactor(user.id)
    assert.equal(loaded.id, user.id)
  })
})
