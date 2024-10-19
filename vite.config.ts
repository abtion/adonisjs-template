import { defineConfig, Plugin } from 'vite'
import { getDirname } from '@adonisjs/core/helpers'
import inertia from '@adonisjs/inertia/client'
import react from '@vitejs/plugin-react'
import adonisjs from '@adonisjs/vite/client'
import istanbulPluginUntyped, { IstanbulPluginOptions } from 'vite-plugin-istanbul'
import env from '#start/env'

//  The types for the default export of 'vite-plugin-istanbul' are not working correctly
const istanbulPlugin = istanbulPluginUntyped as unknown as (opts?: IstanbulPluginOptions) => Plugin

export default defineConfig({
  plugins: [
    inertia({ ssr: { enabled: true, entrypoint: 'inertia/app/ssr.tsx' } }),
    react(),
    adonisjs({ entrypoints: ['inertia/app/app.tsx'], reload: ['resources/views/**/*.edge'] }),
    ...('test' === 'test'
      ? [
          istanbulPlugin({
            include: 'inertia',
            exclude: ['node_modules', 'test/'],
            extension: ['.js', '.ts', '.tsx'],
          }),
        ]
      : []),
  ],

  build: {
    sourcemap: process.env.NODE_ENV !== 'production',
  },

  server: {
    hmr: {
      port: env.get('PORT') + 1,
    },
  },

  /**
   * Define aliases for importing modules from
   * your frontend code
   */
  resolve: {
    alias: {
      '~/': `${getDirname(import.meta.url)}/inertia/`,
    },
  },
})
