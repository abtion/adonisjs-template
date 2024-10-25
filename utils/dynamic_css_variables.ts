import prepareColorVariables from './prepare_color_variables.js'
import colors from '../colors.json' with { type: 'json' }

// Define CSS variables for all colors
// These variables are used by tailwind.
// We use variables because they are easy to override in dev tools or in local selectors
const cssVariables = prepareColorVariables(colors).cssVariables
const cssVariableStrings = Object.entries(cssVariables).map(([name, value]) => `${name}: ${value};`)

export default `
:root {
  ${cssVariableStrings.join('\n  ')}
}
`
