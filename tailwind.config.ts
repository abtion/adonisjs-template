import type { Config } from 'tailwindcss'

import colors from './colors.json' with { type: 'json' }
import { getTailwindColors } from '@abtion-oss/design-system-colors'
import aspectRatioPlugin from '@tailwindcss/aspect-ratio'

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
  plugins: [aspectRatioPlugin],
} satisfies Config
