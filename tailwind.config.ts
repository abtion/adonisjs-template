import type { Config } from 'tailwindcss'

import colors from './colors.json'
import prepareColorVariables from './utils/prepareColorVariables.js'
const tailwindColors = prepareColorVariables(colors).tailwindColors

export default {
  content: ['./inertia/**/*.tsx', './resources/**/*.edge'],
  theme: {
    container: {
      center: true,
      padding: '1rem',
    },
    colors: {
      transparent: 'transparent',
      white: 'white',
      black: 'black',
      current: 'currentColor',
      ...tailwindColors,
    },
  },
  plugins: [require('@tailwindcss/aspect-ratio')],
} satisfies Config