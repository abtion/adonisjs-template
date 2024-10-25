import getContrastColor from './get_contrast_color.js'
import colorString from 'color-string'
import type { Config } from 'tailwindcss'

type TailwindColors = NonNullable<NonNullable<Config['theme']>['colors']>
type JSONColors = {
  light: string
  dark: string
  [color: string]: string | Record<string, string>
}

// Prepare colors for usage in tailwind config and as css variables
export default function prepareColorVariables(jsonColors: JSONColors) {
  const tailwindColors: TailwindColors = {}
  const cssVariables: Record<string, string> = {}

  for (let [colorName, color] of Object.entries(jsonColors)) {
    let tailwindColor: TailwindColors = {}
    let colorHasShades: boolean
    let shades: Record<string, string>
    if (typeof color === 'string') {
      shades = { DEFAULT: color }
      colorHasShades = false
    } else {
      shades = color
      colorHasShades = true
    }

    for (let [shade, colorCode] of Object.entries(shades)) {
      let variableName = `--color-${colorName}`
      if (shade !== 'DEFAULT') variableName += `-${shade}`

      tailwindColor[shade] = `rgb(var(${variableName}) / <alpha-value>)`
      const [colorR, colorG, colorB] = colorString.get.rgb(colorCode)
      cssVariables[variableName] = `${colorR} ${colorG} ${colorB}`

      // Find contrast colors only for colors with shades, and not for manually specified contrast colors
      const shadeIsContrastColor = /^(.+-|)contrast$/.test(shade)
      if (!colorHasShades || shadeIsContrastColor) continue

      const contrastVariantName = shade === 'DEFAULT' ? 'contrast' : `${shade}-contrast`

      // If a color has a manually specified contrast color, don't compute one
      if (shades[contrastVariantName] !== undefined) continue

      const contrastColor = getContrastColor(colorCode, jsonColors.dark, jsonColors.light)
      const contrastVariableName =
        contrastColor === jsonColors.dark ? '--color-dark' : '--color-light'

      if (shade === 'DEFAULT') {
        tailwindColor['contrast'] = `rgb(var(${contrastVariableName}) / <alpha-value>)`
      } else {
        tailwindColor[`${shade}-contrast`] = `rgb(var(${contrastVariableName}) / <alpha-value>)`
      }
    }

    tailwindColors[colorName] = tailwindColor
  }

  return { tailwindColors, cssVariables }
}
