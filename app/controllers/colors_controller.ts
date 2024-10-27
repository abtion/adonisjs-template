import { prepareColorVariables } from '#utils/colors'
import colors from '../../colors.json' with { type: 'json' }
import type { HttpContext } from '@adonisjs/core/http'

let colorsCss: string

export default class ColorsController {
  async handle({ response }: HttpContext) {
    if (!colorsCss) {
      // Define CSS variables for all colors
      // These variables are used by tailwind.
      // We use variables because they are easy to override in dev tools or in local selectors
      const cssVariables = prepareColorVariables(colors).cssVariables
      const cssVariableStrings = Object.entries(cssVariables).map(
        ([name, value]) => `${name}: ${value};`
      )

      colorsCss = `
      :root {
        ${cssVariableStrings.join('\n  ')}
      }
      `
    }

    return response.type('text/css').send(colorsCss)
  }
}
