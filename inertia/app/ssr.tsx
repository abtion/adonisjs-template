import ReactDOMServer from 'react-dom/server'
import { createInertiaApp } from '@inertiajs/react'

import i18next from 'i18next'
import { I18nextProvider } from 'react-i18next'
import i18nextConfig from '../config/i18next_config'

export default function render(page: any) {
  return createInertiaApp({
    page,
    title: (title) => [title, 'Project Name Human'].filter(Boolean).join(' - '),
    render: ReactDOMServer.renderToString,
    resolve: (name) => {
      const pages = import.meta.glob('../pages/**/*.tsx', { eager: true })
      return pages[`../pages/${name}.tsx`]
    },
    setup: ({ App, props }) => {
      const i18n = i18next.createInstance({
        ...i18nextConfig,
        lng: page.props.locale,
      })
      i18n.init()

      return (
        <I18nextProvider i18n={i18n}>
          <App {...props} />
        </I18nextProvider>
      )
    },
  })
}
