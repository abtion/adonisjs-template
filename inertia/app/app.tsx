/// <reference path="../../adonisrc.ts" />
/// <reference path="../../config/inertia.ts" />

import '../css/app.css'
import { hydrateRoot } from 'react-dom/client'
import { createInertiaApp } from '@inertiajs/react'

const appName = import.meta.env.VITE_APP_NAME || 'AdonisJS'

createInertiaApp({
  progress: { color: '#5468FF' },

  title: (title) => `${title} - ${appName}`,

  resolve: (name) => {
    const [module, ...path] = name.split('/')
    const pages = import.meta.glob('../../app/modules/*/pages/*.tsx', { eager: true })
    return pages[`../../app/modules/${module}/pages/${path.join('/')}.tsx`]
  },

  setup({ el, App, props }) {
    hydrateRoot(el, <App {...props} />)
  },
})
