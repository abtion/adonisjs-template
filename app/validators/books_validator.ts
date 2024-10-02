import z from 'zod'

export const createBookValidator = (body: Record<string, any>) =>
  z
    .object({
      name: z.string(),
    })
    .safeParseAsync(body)
