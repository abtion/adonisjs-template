import { recoveryCodeSchema } from '#validators/schemas'
import vine from '@vinejs/vine'

export const postOtpRecoverValidator = vine.compile(
  vine.object({
    recoveryCode: recoveryCodeSchema,
  })
)
