import type { Config } from 'tailwindcss'

import colors from './colors.json'
import { getTailwindColors } from '@abtion-oss/design-system-colors'

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
      ...getTailwindColors(colors),
    },
    fontFamily: {
      sans: ['Inter', 'sans-serif'],
    },
  },
  plugins: [require('@tailwindcss/aspect-ratio')],
} satisfies Config
