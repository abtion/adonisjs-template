import { otpSchema } from '#validators/schemas'
import vine from '@vinejs/vine'

export const postOtpValidator = vine.compile(
  vine.object({
    otp: otpSchema,
  })
)
