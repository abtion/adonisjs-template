import vine from '@vinejs/vine'

/**
 * Validator for security confirmation endpoint
 * Accepts either password (string) or assertion (AuthenticationResponseJSON object)
 * At least one must be provided (validated in controller)
 */
export const confirmSecurityValidator = vine.compile(
  vine.object({
    password: vine.string().optional(),
    assertion: vine
      .object({
        id: vine.string(),
        rawId: vine.string(),
        response: vine.object({
          authenticatorData: vine.string(),
          clientDataJSON: vine.string(),
          signature: vine.string(),
          userHandle: vine.string().optional(),
        }),
        type: vine.string(),
      })
      .optional(),
  })
)
