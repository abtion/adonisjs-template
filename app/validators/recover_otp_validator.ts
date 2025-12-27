import vine from '@vinejs/vine'

export const recoverOtpValidator = vine.compile(
  vine.object({
    recoveryCode: vine.string().trim().minLength(11).maxLength(11),
  })
)
