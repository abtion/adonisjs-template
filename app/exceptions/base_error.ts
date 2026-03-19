export default class BaseError extends Error {
  constructor(
    readonly code: string = 'unknown',
    readonly status = 500,
    readonly field: string = 'base'
  ) {
    super()
  }

  get message() {
    return `${this.constructor.name}: ${this.code}`
  }
}
