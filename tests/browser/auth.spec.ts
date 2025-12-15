import { withGlobalTransaction, db } from '#services/db'
import { createUser } from '#tests/support/factories/user'
import hash from '@adonisjs/core/services/hash'
import { test } from '@japa/runner'
import { expect } from '@playwright/test'
import type { Insertable } from 'kysely'
import type { WebauthnCredentials } from '#database/types'

const defaultCredentialId = Buffer.from('browser-passkey').toString('base64url')

async function createPasskey(
  userId: number,
  overrides: Partial<Insertable<WebauthnCredentials>> = {}
) {
  return db()
    .insertInto('webauthnCredentials')
    .values({
      userId,
      credentialId: overrides.credentialId ?? defaultCredentialId,
      publicKey: overrides.publicKey ?? Buffer.from('public-key').toString('base64url'),
      friendlyName: overrides.friendlyName ?? 'Login Key',
      ...('counter' in overrides ? { counter: overrides.counter } : {}),
      ...('transports' in overrides ? { transports: overrides.transports } : {}),
      ...('deviceType' in overrides ? { deviceType: overrides.deviceType } : {}),
      ...('backedUp' in overrides ? { backedUp: overrides.backedUp } : {}),
      ...('createdAt' in overrides ? { createdAt: overrides.createdAt } : {}),
      ...('updatedAt' in overrides ? { updatedAt: overrides.updatedAt } : {}),
    })
    .executeTakeFirstOrThrow()
}

test.group('Auth', (group) => {
  group.each.setup(() => withGlobalTransaction())

  test('sign in / out', async ({ visit }) => {
    await createUser({ email: 'admin@example.com', password: await hash.make('secret-password') })

    const page = await visit('/')

    await page.getByRole('link', { name: 'components.nav.signIn' }).click()
    await expect(page.locator('h2', { hasText: 'pages.session.signIn.heading' })).toBeVisible()

    // Fill email and submit to check for passkeys
    await page.getByLabel('fields.email').fill('admin@example.com')
    await page.getByRole('button', { name: 'Continue' }).click()

    // Wait for password field to appear (since user has no passkeys)
    await expect(page.getByLabel('fields.password')).toBeVisible()
    await page.getByLabel('fields.password').fill('secret-password')
    await page.getByRole('button', { name: 'pages.session.signIn.signIn' }).click()
    await expect(page.getByText('components.nav.signOut')).toBeVisible()

    await page.getByRole('button', { name: 'components.nav.signOut' }).click()
    await expect(page.getByText('components.nav.signIn')).toBeVisible()
  })

  test('failed sign in', async ({ visit }) => {
    await createUser({ email: 'admin@example.com', password: await hash.make('password') })

    const page = await visit('/sign-in')

    // First attempt to log in without filling in the email field
    await page.getByRole('button', { name: 'Continue' }).click()
    // The check-email endpoint returns an error when email is empty
    await expect(page.getByText('Email is required')).toBeVisible()

    // Fill email and continue to show password field
    await page.getByLabel('fields.email').fill('admin@example.com')
    await page.getByRole('button', { name: 'Continue' }).click()

    // Wait for password field to appear
    await expect(page.getByLabel('fields.password')).toBeVisible()

    // Try to submit without password
    await page.getByRole('button', { name: 'pages.session.signIn.signIn' }).click()
    // Password validation error should appear
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

    await page.pause()

    await expect(page).toHaveURL('/')
  })

  test('passkey attempt falls back to password when WebAuthn fails', async ({
    browserContext,
    visit,
  }) => {
    // Stub WebAuthn API to reject and force fallback
    await browserContext.addInitScript(() => {
      // Ensure navigator.credentials exists
      // @ts-expect-error navigator credentials polyfill for tests
      if (!navigator.credentials) navigator.credentials = {}
      // @ts-expect-error navigator credentials polyfill for tests
      navigator.credentials.get = () => Promise.reject(new Error('passkey failed'))
      // Provide stub PublicKeyCredential to satisfy feature checks
      // @ts-expect-error allow assigning
      window.PublicKeyCredential = function () {}
    })

    const user = await createUser({
      email: 'passkey-user@example.com',
      password: await hash.make('secret-password'),
    })
    await createPasskey(user.id)

    const page = await visit('/sign-in')

    await page.getByLabel('fields.email').fill('passkey-user@example.com')
    await page.getByRole('button', { name: 'Continue' }).click()

    // Passkey flow should have been attempted and failed, showing error and fallback
    await expect(page.getByText('passkey failed')).toBeVisible()
    await expect(page.getByLabel('fields.password')).toBeVisible()
  })
})
