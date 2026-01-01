export default class FormError extends Error {
  constructor(
    readonly translationKey: string,
    readonly field: string = 'base',
    readonly status = 422
  ) {
    super(`FormError: ${translationKey}`)
    this.name = 'FormError'
  }

  static from(error: any) {
    if ('toFormError' in error && typeof error.toFormError === 'function') {
      return error.toFormError()
    }
    return new FormError('errors.fallbackError')
  }

  static catcher(error: any): never {
    throw FormError.from(error)
  }
}
