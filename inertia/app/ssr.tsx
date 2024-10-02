import ReactDOMServer from 'react-dom/server'
import { createInertiaApp } from '@inertiajs/react'

export default function render(page: any) {
  return createInertiaApp({
    page,
    render: ReactDOMServer.renderToString,
    resolve: (name) => {
      const [module, ...path] = name.split('/')
      const pages = import.meta.glob('../../app/modules/*/pages/*.tsx', { eager: true })
      return pages[`../../app/modules/${module}/pages/${path.join('/')}.tsx`]
    },
    setup: ({ App, props }) => <App {...props} />,
  })
}
