import vine from '@vinejs/vine'

export const verifyValidator = vine.compile(
  vine.object({
    otp: vine.string().trim().minLength(6).maxLength(6),
  })
)
