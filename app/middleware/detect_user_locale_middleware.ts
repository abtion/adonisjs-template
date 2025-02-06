import { I18n } from '@adonisjs/i18n'
import i18nManager from '@adonisjs/i18n/services/main'
import type { NextFn } from '@adonisjs/core/types/http'
import { type HttpContext, RequestValidator } from '@adonisjs/core/http'
import type { FieldContext, MessagesProviderContact } from '@vinejs/vine/types'
import app from '@adonisjs/core/services/app'

// This messages provider is a clone of the default messages provider from `I18n.createMessagesProvider`.
// The *only* difference is that we look for field names and error messages respectively under:
// - `fields` (instead of `translator.shared.fields`)
// - `validation` (instead of `translator.shared.messages`)
//
// The purpose is to have the field names in one place, used by both form templates and vine validations
class ValidatorMessagesProvider implements MessagesProviderContact {
  messagesPrefix
  fieldsPrefix
  i18n

  constructor(i18n: I18n) {
    this.fieldsPrefix = `fields`
    this.messagesPrefix = `validation`
    this.i18n = i18n
  }

  getMessage(
    _defaultMessage: string,
    rule: string,
    field: FieldContext,
    meta?: Record<string, any>
  ) {
    let fieldName = field.name
    const translatedFieldName = this.i18n.resolveIdentifier(`${this.fieldsPrefix}.${field.name}`)

    /* v8 ignore start: Our tests run without a locale, so this code is not reached */
    if (translatedFieldName) {
      fieldName = this.i18n.formatRawMessage(translatedFieldName.message)
    }

    const fieldMessage = this.i18n.resolveIdentifier(
      `${this.messagesPrefix}.${field.wildCardPath}.${rule}`
    )
    if (fieldMessage) {
      return this.i18n.formatRawMessage(fieldMessage.message, { field: fieldName, ...meta })
    }

    const ruleMessage = this.i18n.resolveIdentifier(`${this.messagesPrefix}.${rule}`)
    if (ruleMessage) {
      return this.i18n.formatRawMessage(ruleMessage.message, { field: fieldName, ...meta })
    }
    /* v8 ignore end */

    // Do not fall back to default messages. We want all keys to exist in the project translations
    const dynamicValues = { field: fieldName, ...meta }
    const formattedValues = Object.entries(dynamicValues)
      .map(([k, v]) => `${k}:"${v}"`)
      .join(',')
    return `${this.messagesPrefix}.${rule} (${formattedValues})`
  }
}

/**
 * The "DetectUserLocaleMiddleware" middleware uses i18n service to share
 * a request specific i18n object with the HTTP Context
 */
export default class DetectUserLocaleMiddleware {
  /**
   * Using i18n for validation messages. Applicable to only
   * "request.validateUsing" method calls
   */
  static {
    RequestValidator.messagesProvider = (ctx) => {
      return new ValidatorMessagesProvider(ctx.i18n)
    }
  }

  /**
   * This method reads the user language from the "Accept-Language"
   * header and returns the best matching locale by checking it
   * against the supported locales.
   *
   * Feel free to use different mechanism for finding user language.
   */
  protected getRequestLocale(ctx: HttpContext) {
    const userLanguages = ctx.request.languages()
    return i18nManager.getSupportedLocaleFor(userLanguages)
  }

  async handle(ctx: HttpContext, next: NextFn) {
    const language = app.inTest ? 'dev' : this.getRequestLocale(ctx)

    ctx.i18n = i18nManager.locale(language || i18nManager.defaultLocale)

    ctx.containerResolver.bindValue(I18n, ctx.i18n)

    return next()
  }
}

/**
 * Notify TypeScript about i18n property
 */
declare module '@adonisjs/core/http' {
  export interface HttpContext {
    i18n: I18n
  }
}
