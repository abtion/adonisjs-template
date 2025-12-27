export default class FormError extends Error {
  public readonly field: string

  constructor(message: string, field: string = 'base') {
    super(message)
    this.name = 'FormError'
    this.field = field
  }
}
