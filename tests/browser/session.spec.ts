import { withGlobalTransaction } from '#services/db'
import { createUser } from '#tests/support/factories/user'
import hash from '@adonisjs/core/services/hash'
import { test } from '@japa/runner'
import { expect } from '@playwright/test'

test.group('Session', (group) => {
  group.each.setup(() => withGlobalTransaction())

  test('sign in / out', async ({ visit }) => {
    await createUser({
      email: 'admin@example.com',
      password: await hash.make('secret-password'),
    })

    const page = await visit('/')

    await page.getByRole('link', { name: 'Sign in' }).click()

    await expect(page.locator('h2', { hasText: 'Sign in' })).toBeVisible()

    await page.getByLabel('Email').fill('admin@example.com')
    await page.getByLabel('Password').fill('secret-password')
    await page.getByRole('button', { name: 'Sign in' }).click()

    await expect(page.getByText('Sign out')).toBeVisible()
    await page.getByRole('button', { name: 'Sign out' }).click()

    await expect(page.getByText('Sign in')).toBeVisible()
  })

  test('failed sign in', async ({ visit }) => {
    await createUser({
      email: 'admin@example.com',
      password: await hash.make('password'),
    })

    const page = await visit('/sign-in')

    await page.getByLabel('Email').fill('admin@example.com')
    await page.getByLabel('Password').fill('incorrect password')
    await page.getByRole('button', { name: 'Sign in' }).click()

    await expect(page.getByText('Invalid credentials')).toBeVisible()
  })
})
