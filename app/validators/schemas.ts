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

export const webautnRegistrationResponse = vine.object({
  id: vine.string(),
  rawId: vine.string(),
  response: vine.object({
    attestationObject: vine.string(),
    clientDataJSON: vine.string(),
    transports: vine
      .array(vine.enum(['ble', 'cable', 'hybrid', 'internal', 'nfc', 'smart-card', 'usb']))
      .optional(),
  }),
  clientExtensionResults: vine.object({
    appid: vine.boolean().optional(),
    credProps: vine
      .object({
        rk: vine.boolean().optional(),
      })
      .optional(),
    hmacCreateSecret: vine.boolean().optional(),
  }),
  type: vine.enum(['public-key']),
})

export const otpSchema = vine.string().trim().minLength(6).maxLength(6)

export const recoveryCodeSchema = vine.string().trim().minLength(11).maxLength(11)
