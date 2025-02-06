import { withGlobalTransaction } from '#services/db'
import { createUser } from '#tests/support/factories/user'
import { test } from '@japa/runner'
import { expect } from '@playwright/test'

test.group('Users', (group) => {
  group.each.setup(() => withGlobalTransaction())
  group.each.setup(async ({ context: { browserContext } }) => {
    const user = await createUser({ admin: true })
    await browserContext.loginAs(user)
  })

  test('CRUD user', async ({ visit }) => {
    const page = await visit('/users')

    // Create
    await expect(page.getByText('List of users')).toBeVisible()
    await page.getByRole('link', { name: 'New' }).click()

    await expect(page.getByText('New user')).toBeVisible()
    await page.getByLabel('Name').fill('User Userson')

    await expect(page.getByText('Email')).toBeVisible()
    await page.getByLabel('Email').fill('user@userson.com')

    await expect(page.getByText('Password')).toBeVisible()
    await page.getByLabel('Password').fill('password')

    await page.getByRole('button', { name: 'Create' }).click()
    await expect(page.getByText('List of users')).toBeVisible()

    // Read
    page.getByText('user@userson.com').click()
    await expect(page.locator('h1', { hasText: 'User Userson' })).toBeVisible()

    // Update
    page.getByText('Edit').click()
    await expect(page.locator('h1', { hasText: 'Edit User Userson' })).toBeVisible()
    await expect(page.getByText('Email')).toBeVisible()
    await page.getByLabel('Email').fill('user@userson.eu')
    await page.getByRole('button', { name: 'Save' }).click()

    await expect(page.getByText('List of users')).toBeVisible()
    await expect(page.getByText('user@userson.eu')).toBeVisible()

    // Delete
    const userNameElement = page.getByText('User Userson')
    const userRowElement = userNameElement.locator('..')
    const userDeleteButton = userRowElement.getByRole('button', {
      name: 'Delete',
    })

    page.on('dialog', (dialog) => dialog.accept())
    await userDeleteButton.click()

    await expect(userDeleteButton).not.toBeVisible()
    await expect(page.getByText('User Userson')).not.toBeVisible()
  })
})
