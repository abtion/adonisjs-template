import vine from '@vinejs/vine'

export const createBookValidator = vine.compile(
  vine.object({
    name: vine.string(),
  })
)
