import BaseError from './base_error.ts'

export default class FormError extends BaseError {
  constructor(code: string, status = 422, field: string = 'base') {
    super(code, status, field)
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
