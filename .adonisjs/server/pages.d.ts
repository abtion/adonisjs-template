import '@adonisjs/inertia/types'

import type React from 'react'
import type { Prettify } from '@adonisjs/core/types/common'

type ExtractProps<T> =
  T extends React.FC<infer Props>
    ? Prettify<Omit<Props, 'children'>>
    : T extends React.Component<infer Props>
      ? Prettify<Omit<Props, 'children'>>
      : never

declare module '@adonisjs/inertia/types' {
  export interface InertiaPages {
    '_test/warm-up': ExtractProps<(typeof import('../../inertia/pages/_test/warm-up.tsx'))['default']>
    'errors/notFound': ExtractProps<(typeof import('../../inertia/pages/errors/notFound.tsx'))['default']>
    'errors/serverError': ExtractProps<(typeof import('../../inertia/pages/errors/serverError.tsx'))['default']>
    'home/index': ExtractProps<(typeof import('../../inertia/pages/home/index.tsx'))['default']>
    'profile/index': ExtractProps<(typeof import('../../inertia/pages/profile/index.tsx'))['default']>
    'session/index': ExtractProps<(typeof import('../../inertia/pages/session/index.tsx'))['default']>
    'session/totp': ExtractProps<(typeof import('../../inertia/pages/session/totp.tsx'))['default']>
    'session/totpRecover': ExtractProps<(typeof import('../../inertia/pages/session/totpRecover.tsx'))['default']>
    'signIn/index': ExtractProps<(typeof import('../../inertia/pages/signIn/index.tsx'))['default']>
    'users/create': ExtractProps<(typeof import('../../inertia/pages/users/create.tsx'))['default']>
    'users/edit': ExtractProps<(typeof import('../../inertia/pages/users/edit.tsx'))['default']>
    'users/index': ExtractProps<(typeof import('../../inertia/pages/users/index.tsx'))['default']>
    'users/show': ExtractProps<(typeof import('../../inertia/pages/users/show.tsx'))['default']>
  }
}
