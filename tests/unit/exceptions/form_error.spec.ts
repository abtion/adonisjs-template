import { test } from '@japa/runner'
import FormError from '#exceptions/form_error'

test.group('FormError', () => {
  test('from() returns fallback error when toFormError is not available', ({ assert }) => {
    const plainError = new Error('Some error')

    const result = FormError.from(plainError)

    assert.instanceOf(result, FormError)
    assert.equal(result.translationKey, 'errors.fallbackError')
    assert.equal(result.field, 'base')
  })
})
