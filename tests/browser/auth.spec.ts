import { withGlobalTransaction } from '#services/db'
import { createUser } from '#tests/support/factories/user'
import { createWebauthnCredential } from '#tests/support/factories/webauthn_credential'
import {
  addBrowserWebauthnCredential,
  initiateBrowserWebauthnAuthenticator,
} from '#tests/support/webauthn'
import hash from '@adonisjs/core/services/hash'
import { test } from '@japa/runner'
import { expect } from '@playwright/test'

test.group('Auth', (group) => {
  group.each.setup(() => withGlobalTransaction())

  test('sign in / out', async ({ visit }) => {
    await createUser({ email: 'admin@example.com', password: await hash.make('secret-password') })

    const page = await visit('/')

    await page.getByRole('link', { name: 'components.nav.signIn' }).click()
    await expect(page.locator('h2', { hasText: 'pages.session.signIn.heading' })).toBeVisible()

    // Fill email and submit to check for webauthns
    await page.getByLabel('fields.email').fill('admin@example.com')
    await page.getByRole('button', { name: 'pages.session.signIn.continue' }).click()

    // Wait for password field to appear (since user has no webauthns)
    await expect(page.getByLabel('fields.password')).toBeVisible()
    await page.getByLabel('fields.password').fill('secret-password')
    await page.getByRole('button', { name: 'pages.session.signIn.signIn' }).click()
    await expect(page.getByText('components.nav.signOut')).toBeVisible()

    await page.getByRole('button', { name: 'components.nav.signOut' }).click()
    await expect(page.getByText('components.nav.signIn')).toBeVisible()
  })

  test('sign in with webauthns', async ({ visit }) => {
    const user = await createUser({
      email: 'admin@example.com',
      password: await hash.make('secret-password'),
    })

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
    await page.getByLabel('fields.email').fill('admin@example.com')
    await page.getByRole('button', { name: 'pages.session.signIn.continue' }).click()

    await expect(page.getByText('components.nav.signOut')).toBeVisible()
  })

  test('failed sign in', async ({ visit }) => {
    await createUser({ email: 'admin@example.com', password: await hash.make('password') })
    const page = await visit('/sign-in')

    // First attempt to log in without filling in the email field
    await page.getByRole('button', { name: 'pages.session.signIn.continue' }).click()

    // The check-email endpoint returns an error when email is empty
    await expect(page.getByText('validation.required (field:"email")')).toBeVisible()

    // Fill email and continue to show password field
    await page.getByLabel('fields.email').fill('admin@example.com')
    await page.getByRole('button', { name: 'pages.session.signIn.continue' }).click()

    // Wait for password field to appear
    await expect(page.getByLabel('fields.password')).toBeVisible()

    // Try to submit without password
    await page.getByRole('button', { name: 'pages.session.signIn.signIn' }).click()
    await expect(page.getByText('validation.required (field:"password")')).toBeVisible()

    // Try with wrong password
    await page.getByLabel('fields.password').fill('incorrect password')
    await page.getByRole('button', { name: 'pages.session.signIn.signIn' }).click()

    await expect(page.getByText('pages.session.signIn.invalidCredentials')).toBeVisible()
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
      password: await hash.make('secret-password'),
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
