import { getColorStyles } from '@abtion-oss/design-system-colors'
import colors from '../../colors.json' with { type: 'json' }
import type { HttpContext } from '@adonisjs/core/http'

let colorsCss: string

export default class ColorsController {
  async handle({ response }: HttpContext) {
    if (!colorsCss) colorsCss = getColorStyles(colors)
    return response.type('text/css').send(colorsCss)
  }
}
