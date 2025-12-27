import vine from '@vinejs/vine'

export const verifyOtpValidator = vine.compile(
  vine.object({
    otp: vine.string().trim().minLength(6).maxLength(6),
  })
)
