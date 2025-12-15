import { test } from '@japa/runner'
import {
  parseTwoFactorSecret,
  parseRecoveryCodes,
  loadUserWithTwoFactor,
  parseTransports,
  markSecurityConfirmed,
  isSecurityConfirmed,
  SECURITY_CONFIRMATION_KEY,
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

  test('markSecurityConfirmed stores timestamp', ({ assert }) => {
    const session = {
      data: {} as Record<string, any>,
      put(key: string, value: any) {
        this.data[key] = value
      },
      get(key: string) {
        return this.data[key]
      },
    } as any

    markSecurityConfirmed(session)
    const timestamp = session.get(SECURITY_CONFIRMATION_KEY)

    assert.isNumber(timestamp)
    assert.isTrue(timestamp > 0)
    // Should be recent (within last second)
    assert.isTrue(Date.now() - timestamp < 1000)
  })

  test('isSecurityConfirmed returns true for recent confirmation', ({ assert }) => {
    const session = {
      data: {} as Record<string, any>,
      put(key: string, value: any) {
        this.data[key] = value
      },
      get(key: string) {
        return this.data[key]
      },
    } as any

    markSecurityConfirmed(session)
    assert.isTrue(isSecurityConfirmed(session))
  })

  test('isSecurityConfirmed returns false for expired confirmation', ({ assert }) => {
    const session = {
      data: {} as Record<string, any>,
      put(key: string, value: any) {
        this.data[key] = value
      },
      get(key: string) {
        return this.data[key]
      },
    } as any

    // Set timestamp to 6 minutes ago (expired)
    const expiredTimestamp = Date.now() - 6 * 60 * 1000
    session.put(SECURITY_CONFIRMATION_KEY, expiredTimestamp)

    assert.isFalse(isSecurityConfirmed(session))
  })

  test('isSecurityConfirmed returns false for missing confirmation', ({ assert }) => {
    const session = {
      data: {} as Record<string, any>,
      get(key: string) {
        return this.data[key]
      },
    } as any

    assert.isFalse(isSecurityConfirmed(session))
  })

  test('isSecurityConfirmed returns false for invalid confirmation value', ({ assert }) => {
    const session = {
      data: {} as Record<string, any>,
      get(key: string) {
        return this.data[key]
      },
    } as any

    session.data[SECURITY_CONFIRMATION_KEY] = 'invalid'
    assert.isFalse(isSecurityConfirmed(session))
  })

  test('isSecurityConfirmed maintains backward compatibility with boolean true', ({ assert }) => {
    const session = {
      data: {} as Record<string, any>,
      get(key: string) {
        return this.data[key]
      },
    } as any

    session.data[SECURITY_CONFIRMATION_KEY] = true
    assert.isTrue(isSecurityConfirmed(session))
  })
})
