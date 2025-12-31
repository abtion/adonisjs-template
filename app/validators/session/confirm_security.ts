import vine from '@vinejs/vine'
import { webauthnAssertion } from '../schemas.js'

export const confirmSecurityValidator = vine.compile(
  vine.object({}).merge(
    vine
      .group([
        vine.group.if((data) => data.password, { password: vine.string() }),
        vine.group.if((data) => data.assertion, { assertion: webauthnAssertion }),
      ])
      .otherwise((_, field) => {
        field.report('Password or assertion required', 'passwordOrAssertion', field)
      })
  )
)
