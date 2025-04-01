/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'
import { middleware } from './kernel.js'

// Remember to *always lazy load controllers*, otherwise hot module reload won't work
const UsersController = () => import('#controllers/users_controller')
const SessionController = () => import('#controllers/session_controller')
const ColorsController = () => import('#controllers/colors_controller')
const AccessTokenSessionController = () => import('#controllers/access_token_session_controller')

// Home
router.on('/').renderInertia('home/index')

// CRUD routes
router.resource('users', UsersController).use('*', middleware.auth())

// Session management
router.get('sign-in', [SessionController, 'show']).use(middleware.guest())
router.post('sign-in', [SessionController, 'store']).use(middleware.guest())
router.delete('session', [SessionController, 'destroy']).use(middleware.auth())

router.post('access-token-session', [AccessTokenSessionController, 'store'])
router
  .delete('access-token-session', [AccessTokenSessionController, 'delete'])
  .use(middleware.auth({ guards: ['api'] }))

router.get('/colors.css', [ColorsController])
