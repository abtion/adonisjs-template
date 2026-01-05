import vine from '@vinejs/vine'

export const webauthnAssertion = vine.object({
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

export const otpSchema = vine.string().trim().minLength(6).maxLength(6)

export const recoveryCodeSchema = vine.string().trim().minLength(11).maxLength(11)
