import BaseError from './base_error.ts'

export default class FormError extends BaseError {
  constructor(
    readonly code: string = 'FormError',
    readonly status = 422,
    readonly field: string = 'base'
  ) {
    super(`FormError: ${code}`)
  }

  static from(error: any) {
    if ('toFormError' in error && typeof error.toFormError === 'function') {
      return error.toFormError()
    }
    return new FormError('fallbackError')
  }

  static catcher(error: any): never {
    throw FormError.from(error)
  }
}
