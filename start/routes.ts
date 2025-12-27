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
const SessionOptionsController = () => import('#controllers/session/options_controller')
const SessionTotpController = () => import('#controllers/session/totp_controller')
const SessionTotpRecoverController = () => import('#controllers/session/totp_recover_controller')
const SessionWebauthnController = () => import('#controllers/session/webauthn_controller')
const ProfileTotpController = () => import('#controllers/profile/totp_controller')
const ProfileConfirmSecurityController = () =>
  import('#controllers/profile/confirm_security_controller')
const ProfileWebauthnController = () => import('#controllers/profile/webauthn_controller')
const ProfileController = () => import('#controllers/profile_controller')

// Validate id to be numeric + cast to number data type
router.where('id', router.matchers.number())

// Home
router.on('/').renderInertia('home/index')

// Authenticated routes
router
  .group(() => {
    router.resource('users', UsersController)

    router.get('profile', [ProfileController, 'show'])

    // Webauthn setup
    router.get('profile/webauthn/options', [ProfileWebauthnController, 'options'])
    router.resource('profile/webauthn', ProfileWebauthnController).apiOnly()

    // TOTP setups
    router.post('profile/totp', [ProfileTotpController, 'store'])
    router.post('profile/totp/verify', [ProfileTotpController, 'verify'])
    router.delete('profile/totp', [ProfileTotpController, 'destroy'])
    router.post('profile/totp/regeneration', [ProfileTotpController, 'regenerateRecoveryCodes'])

    // Confirm security for sensitive actions
    router.get('profile/confirm-security', [ProfileConfirmSecurityController, 'index'])
    router.post('profile/confirm-security', [ProfileConfirmSecurityController, 'store'])

    router.delete('session', [SessionController, 'destroy'])
  })
  .use([middleware.auth()])

// Session routes (not accessible when authenticated)
router
  .group(() => {
    router.get('sign-in', [SessionController, 'show'])
    router.post('session', [SessionController, 'store'])
    router.get('session/options/:email', [SessionOptionsController])

    // Webauthn
    router.get('session/webauthn/:email', [SessionWebauthnController, 'index'])
    router.post('session/webauthn/:email', [SessionWebauthnController, 'store'])

    // TOTP
    router.get('session/totp', [SessionTotpController, 'index'])
    router.post('session/totp', [SessionTotpController, 'store'])
    router.get('session/totp/recover', [SessionTotpRecoverController, 'index'])
    router.post('session/totp/recover', [SessionTotpRecoverController, 'store'])
  })
  .use(middleware.guest())

// Static routes
router.get('/colors.css', [ColorsController])
