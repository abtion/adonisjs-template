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
const TwoFactorController = () => import('#controllers/two_factor_controller')
const WebauthnController = () => import('#controllers/webauthn_controller')
const ProfileController = () => import('#controllers/profile_controller')

// Home
router.on('/').renderInertia('home/index')

// CRUD routes
router.resource('users', UsersController).use('*', [middleware.auth(), middleware.twoFactor()])

// Session management
router.get('sign-in', [SessionController, 'show']).use(middleware.guest())
router.post('sign-in/check-email', [SessionController, 'checkEmail']).use(middleware.guest())
router.post('sign-in', [SessionController, 'store']).use(middleware.guest())
router
  .post('passwordless/options', [SessionController, 'passwordlessOptions'])
  .use(middleware.guest())
router
  .post('passwordless/verify', [SessionController, 'passwordlessVerify'])
  .use(middleware.guest())
router.delete('session', [SessionController, 'destroy']).use(middleware.auth())

router.get('profile', [ProfileController, 'show']).use(middleware.auth())
router
  .post('profile/confirm-security/options', [ProfileController, 'confirmSecurityOptions'])
  .use(middleware.auth())
router
  .post('profile/confirm-security', [ProfileController, 'confirmSecurity'])
  .use(middleware.auth())
router.post('profile/enable-mfa', [ProfileController, 'enable']).use(middleware.auth())
router.delete('profile/passkeys/:id', [ProfileController, 'removePasskey']).use(middleware.auth())

router
  .group(() => {
    router.get('challenge', [TwoFactorController, 'challenge']).as('challenge')
    router.post('totp/generate', [TwoFactorController, 'generate']).as('totp.generate')
    router.post('totp/verify', [TwoFactorController, 'verify']).as('totp.verify')
    router
      .post('recovery-codes', [TwoFactorController, 'generateRecoveryCodes'])
      .as('recovery.generate')
    router.post('disable', [TwoFactorController, 'disable']).as('disable')

    router
      .post('webauthn/register/options', [WebauthnController, 'registerOptions'])
      .as('webauthn.registerOptions')
    router
      .post('webauthn/register/verify', [WebauthnController, 'verifyRegistration'])
      .as('webauthn.verifyRegistration')
    router
      .post('webauthn/authenticate/options', [WebauthnController, 'authenticationOptions'])
      .as('webauthn.authenticationOptions')
    router
      .post('webauthn/authenticate/verify', [WebauthnController, 'verifyAuthentication'])
      .as('webauthn.verifyAuthentication')
  })
  .as('2fa')
  .prefix('2fa')
  .middleware(middleware.auth())

router.get('/colors.css', [ColorsController])
