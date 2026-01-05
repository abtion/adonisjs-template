import { test } from '@japa/runner'
import { WebauthnError } from '#services/webauthn'

test.group('WebauthnError', () => {
  test('toFormError returns fallback error for unmapped error class', ({ assert }) => {
    const error = new WebauthnError()

    const formError = error.toFormError()

    assert.equal(formError.translationKey, 'errors.fallbackError')
  })
})
