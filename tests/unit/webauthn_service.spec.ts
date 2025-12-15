import { test } from '@japa/runner'
import {
  getRpId,
  getOrigin,
  getRpName,
  fromBase64Url,
  toBase64Url,
} from '#services/webauthn_service'

test.group('WebAuthn Service', () => {
  test('getRpId returns configured RP ID or extracts from origin', ({ assert }) => {
    const rpId = getRpId()
    assert.isString(rpId)
    assert.isNotEmpty(rpId)
  })

  test('getOrigin returns configured origin or fallback', ({ assert }) => {
    const origin = getOrigin()
    assert.isString(origin)
    assert.isNotEmpty(origin)
    // Should be a valid URL format
    assert.match(origin, /^https?:\/\//)
  })

  test('getRpName returns configured RP name or fallback', ({ assert }) => {
    const rpName = getRpName()
    assert.isString(rpName)
    assert.isNotEmpty(rpName)
  })

  test('fromBase64Url converts base64url string to Uint8Array', ({ assert }) => {
    const base64url = 'dGVzdA' // base64url for "test"
    const result = fromBase64Url(base64url)
    assert.instanceOf(result, Uint8Array)
    assert.equal(result.length, 4)
    assert.equal(result[0], 116) // 't'
    assert.equal(result[1], 101) // 'e'
    assert.equal(result[2], 115) // 's'
    assert.equal(result[3], 116) // 't'
  })

  test('toBase64Url converts Uint8Array to base64url string', ({ assert }) => {
    const uint8Array = new Uint8Array([116, 101, 115, 116]) // "test"
    const result = toBase64Url(uint8Array)
    assert.isString(result)
    assert.equal(result, 'dGVzdA')
  })

  test('toBase64Url converts Buffer to base64url string', ({ assert }) => {
    const buffer = Buffer.from('test')
    const result = toBase64Url(buffer)
    assert.isString(result)
    assert.equal(result, 'dGVzdA')
  })

  test('toBase64Url converts ArrayBuffer to base64url string', ({ assert }) => {
    const arrayBuffer = new ArrayBuffer(4)
    const view = new Uint8Array(arrayBuffer)
    view.set([116, 101, 115, 116])
    const result = toBase64Url(arrayBuffer)
    assert.isString(result)
    assert.equal(result, 'dGVzdA')
  })

  test('fromBase64Url and toBase64Url are inverse operations', ({ assert }) => {
    const original = 'test-data-123'
    const base64url = Buffer.from(original).toString('base64url')
    const uint8Array = fromBase64Url(base64url)
    const result = toBase64Url(uint8Array)
    assert.equal(result, base64url)
    assert.equal(Buffer.from(uint8Array).toString(), original)
  })
})
