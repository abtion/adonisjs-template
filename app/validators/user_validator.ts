import vine from '@vinejs/vine'

export const createUserValidator = vine.compile(
  vine.object({
    email: vine.string().email(),
    name: vine.string(),
    password: vine.string().minLength(6),
  })
)

export const updateUserValidator = vine.compile(
  vine.object({
    email: vine.string().email(),
    name: vine.string(),
    password: vine.string().minLength(6).optional(),
  })
)
