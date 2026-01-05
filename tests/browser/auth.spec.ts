import { withGlobalTransaction } from '#services/db'
import { createUser } from '#tests/support/factories/user'
import { createWebauthnCredential } from '#tests/support/factories/webauthn_credential'
import {
  addBrowserWebauthnCredential,
  initiateBrowserWebauthnAuthenticator,
} from '#tests/support/webauthn'
import encryption from '@adonisjs/core/services/encryption'
import hash from '@adonisjs/core/services/hash'
import adonis2fa from '@nulix/adonis-2fa/services/main'
import { test } from '@japa/runner'
import { expect } from '@playwright/test'

test.group('Auth', (group) => {
  group.each.setup(() => withGlobalTransaction())

  test('sign in / out', async ({ visit }) => {
    await createUser({ email: 'admin@example.com', password: await hash.make('password') })

    const page = await visit('/')

    await page.getByRole('link', { name: 'components.nav.signIn' }).click()
    await expect(page.locator('h2', { hasText: 'pages.session.signIn.heading' })).toBeVisible()

    // Fill email and submit to check for webauthns
    await page.getByLabel('fields.email').fill('admin@example.com')
    await page.getByRole('button', { name: 'pages.session.signIn.continue' }).click()

    // Wait for password field to appear (since user has no webauthns)
    await expect(page.getByLabel('fields.password')).toBeVisible()
    await page.getByLabel('fields.password').fill('password')
    await page.getByRole('button', { name: 'pages.session.signIn.signIn' }).click()
    await expect(page.getByText('components.nav.signOut')).toBeVisible()

    await page.getByRole('button', { name: 'components.nav.signOut' }).click()
    await expect(page.getByText('components.nav.signIn')).toBeVisible()
  })

  test('sign in with webauthns', async ({ visit }) => {
    const user = await createUser()
    const page = await visit('/sign-in')

    const cdpSession = await page.context().newCDPSession(page)
    const authenticatorId = await initiateBrowserWebauthnAuthenticator(cdpSession)
    const { credentialId, publicKeyCose } = await addBrowserWebauthnCredential(
      cdpSession,
      authenticatorId
    )
    await createWebauthnCredential({
      userId: user.id,
      publicKey: publicKeyCose.toString('base64url'),
      credentialId: credentialId.toString('base64url'),
    })

    // Continue the sign-in flow; the page should attempt to use the webauthn
    await page.getByLabel('fields.email').fill(user.email)
    await page.getByRole('button', { name: 'pages.session.signIn.continue' }).click()

    await expect(page.getByText('components.nav.signOut')).toBeVisible()
  })

  test('sign in with totp enabled', async ({ visit }) => {
    const totpSecret = await adonis2fa.generateSecret('totp-user@example.com')

    await createUser({
      email: 'totp-user@example.com',
      password: await hash.make('password'),
      totpEnabled: true,
      totpSecretEncrypted: encryption.encrypt(totpSecret.secret),
      totpRecoveryCodesEncrypted: encryption.encrypt(['RECOVERY-CODE-1']),
    })

    const page = await visit('/sign-in')

    await page.getByLabel('fields.email').fill('totp-user@example.com')
    await page.getByRole('button', { name: 'pages.session.signIn.continue' }).click()
    await page.getByLabel('fields.password').fill('password')
    await page.getByRole('button', { name: 'pages.session.signIn.signIn' }).click()

    // Should be redirected to TOTP verification page
    await expect(page).toHaveURL('/session/totp')
    const validOtp = adonis2fa.generateToken(totpSecret.secret)!
    await page.getByLabel('fields.otp').fill(validOtp)
    await page.getByRole('button', { name: 'pages.session.totp.verifyButton' }).click()

    await expect(page.getByText('components.nav.signOut')).toBeVisible()
  })

  test('sign in with totp recover code', async ({ visit }) => {
    await createUser({
      email: 'totp-user@example.com',
      password: await hash.make('password'),
      totpEnabled: true,
      totpSecretEncrypted: encryption.encrypt('not-used'),
      totpRecoveryCodesEncrypted: encryption.encrypt(['ABCDE 12345']),
    })

    const page = await visit('/sign-in')

    await page.getByLabel('fields.email').fill('totp-user@example.com')
    await page.getByRole('button', { name: 'pages.session.signIn.continue' }).click()
    await page.getByLabel('fields.password').fill('password')
    await page.getByRole('button', { name: 'pages.session.signIn.signIn' }).click()
    await page.getByRole('button', { name: 'pages.session.totp.cannotAccessAccount' }).click()
    await page.getByLabel('fields.recoveryCode').fill('ABCDE 12345')
    await page.getByRole('button', { name: 'pages.session.totpRecover.verifyButton' }).click()

    await expect(page.getByText('components.nav.signOut')).toBeVisible()
  })

  test('failed sign in', async ({ visit }) => {
    await createUser({ email: 'admin@example.com', password: await hash.make('password') })
    const page = await visit('/sign-in')

    await page.getByRole('button', { name: 'pages.session.signIn.continue' }).click()
    await expect(page.getByText('validation.required (field:"email")')).toBeVisible()

    await page.getByLabel('fields.email').fill('admin@example.com')
    await page.getByRole('button', { name: 'pages.session.signIn.continue' }).click()
    await expect(page.getByLabel('fields.password')).toBeVisible()

    await page.getByRole('button', { name: 'pages.session.signIn.signIn' }).click()
    await expect(page.getByText('validation.passwordOrAssertion')).toBeVisible()

    await page.getByLabel('fields.password').fill('incorrect password')
    await page.getByRole('button', { name: 'pages.session.signIn.signIn' }).click()
    await expect(page.getByText('errors.invalidCredentials')).toBeVisible()

    await page.getByRole('button', { name: 'pages.session.signIn.back' }).click()
    await page.getByLabel('fields.email').fill('not-a-user@example.com')
    await page.getByRole('button', { name: 'pages.session.signIn.continue' }).click()
    await page.getByLabel('fields.password').fill('password')
    await page.getByRole('button', { name: 'pages.session.signIn.signIn' }).click()
    await expect(page.getByText('errors.invalidCredentials')).toBeVisible()
  })

  test('already signed in users are redirected await from sign-in page', async ({
    browserContext,
    visit,
  }) => {
    const user = await createUser()
    await browserContext.loginAs(user)

    const page = await visit('/sign-in')

    await expect(page).toHaveURL('/')
  })

  test('webauthn attempt falls back to password when WebAuthn fails', async ({ visit }) => {
    const user = await createUser({
      email: 'webauthn-user@example.com',
    })

    const page = await visit('/sign-in')
    const cdpSession = await page.context().newCDPSession(page)
    await initiateBrowserWebauthnAuthenticator(cdpSession)

    createWebauthnCredential({
      userId: user.id,
      publicKey: btoa('invalid-public-key'),
      credentialId: btoa('invalid-credential-id'),
    })

    await page.getByLabel('fields.email').fill('webauthn-user@example.com')
    await page.getByRole('button', { name: 'pages.session.signIn.continue' }).click()

    await expect(page.getByText('pages.session.signIn.webauthnFailed')).toBeVisible()
    await expect(page.getByLabel('fields.password')).toBeVisible()
  })
})
