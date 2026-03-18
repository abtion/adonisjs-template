import { webautnRegistrationResponse } from '#validators/schemas'
import vine from '@vinejs/vine'

export const createOtpValidator = vine.create(
  vine.object({
    attestation: webautnRegistrationResponse,
    friendlyName: vine.string().optional(),
  })
)
