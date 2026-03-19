/// <reference path="../adonisrc.ts" />
/// <reference path="../config/inertia.ts" />

import './css/app.scss'
import { hydrateRoot } from 'react-dom/client'
import { createInertiaApp } from '@inertiajs/react'
import { resolvePageComponent } from '@adonisjs/inertia/helpers'
import i18next from 'i18next'
import { I18nextProvider } from 'react-i18next'
import { SharedProps } from '@adonisjs/inertia/types'
import i18nextConfig from './config/i18next_config'
import { client } from './client'
import { TuyauProvider } from '@adonisjs/inertia/react'

// eslint-disable-next-line @adonisjs/no-backend-import-in-frontend
import colors from '../colors.json'

createInertiaApp<SharedProps>({
  progress: { color: colors.primary.DEFAULT },

  title: (title) => [title, 'Project Name Human'].filter(Boolean).join(' - '),

  resolve: (name) =>
    resolvePageComponent(`./pages/${name}.tsx`, import.meta.glob('./pages/**/*.tsx')),

  setup({ el, App, props }) {
    const i18n = i18next.createInstance({
      ...i18nextConfig,
      lng: props.initialPage.props.locale,
    })
    i18n.init()

    hydrateRoot(
      el,
      <I18nextProvider i18n={i18n}>
        <TuyauProvider client={client}>
          <App {...props} />
        </TuyauProvider>
      </I18nextProvider>
    )
  },
})
