import { configApp } from '@adonisjs/eslint-config'

export default [
  ...configApp(),
  {
    // Generated files
    ignores: ['database/types.d.ts', 'coverage/**/*', '.adonisjs/**/*'],
  },
  {
    files: ['**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-shadow': 'off',
    },
  },
]
