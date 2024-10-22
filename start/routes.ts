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
const dynamicCssVariables = () => import('#utils/dynamicCssVariables')

// Home
router.on('/').renderInertia('home/index')

// CRUD routes
router.resource('users', UsersController).use('*', middleware.auth())

// Session management
router.get('sign-in', [SessionController, 'show']).use(middleware.guest())
router.post('sign-in', [SessionController, 'store']).use(middleware.guest())
router.delete('session', [SessionController, 'destroy']).use(middleware.auth())

let cssVariables: string
router.get('/colors.css', async ({ response }) => {
  if (!cssVariables) cssVariables = (await dynamicCssVariables()).default

  response.type('text/css').send(cssVariables)
})
