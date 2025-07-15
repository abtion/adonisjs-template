import { withGlobalTransaction } from '#services/db'
import { createUser } from '#tests/support/factories/user'
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

    await page.getByLabel('fields.email').fill('admin@example.com')
    await page.getByLabel('fields.password').fill('secret-password')
    await page.getByRole('button', { name: 'pages.session.signIn.signIn' }).click()
    await expect(page.getByText('components.nav.signOut')).toBeVisible()

    await page.getByRole('button', { name: 'components.nav.signOut' }).click()
    await expect(page.getByText('components.nav.signIn')).toBeVisible()
  })

  test('failed sign in', async ({ visit }) => {
    await createUser({ email: 'admin@example.com', password: await hash.make('password') })

    const page = await visit('/sign-in')

    // First attempt to log in without filling in the fields
    await page.getByRole('button', { name: 'pages.session.signIn.signIn' }).click()
    await expect(page.getByText('validation.required (field:"email")')).toBeVisible()
    await expect(page.getByText('validation.required (field:"password")')).toBeVisible()

    // Then fill in invalid credentials
    await page.getByLabel('fields.email').fill('incorrect@user.com')
    await page.getByLabel('fields.password').fill('incorrect password')
    await page.getByRole('button', { name: 'pages.session.signIn.signIn' }).click()

    await page.getByLabel('fields.email').fill('admin@example.com')
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
})
