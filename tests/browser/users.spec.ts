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
    await expect(page.getByText('pages.users.index.heading')).toBeVisible()
    await page.getByRole('link', { name: 'common.new' }).click()

    await expect(page.getByText('pages.users.create.heading')).toBeVisible()
    await page.getByLabel('fields.name').fill('User Userson')
    await page.getByLabel('fields.email').fill('user@userson.com')
    await page.getByLabel('fields.password').fill('password')

    await page.getByRole('button', { name: 'common.create' }).click()
    await expect(page.getByText('pages.users.index.heading')).toBeVisible()

    // Read
    page.getByText('user@userson.com').click()
    await expect(page.locator('h1', { hasText: 'pages.users.show.heading' })).toBeVisible()

    // Update
    page.getByText('common.edit').click()
    await expect(page.locator('h1', { hasText: 'pages.users.edit.heading' })).toBeVisible()
    await page.getByLabel('fields.email').fill('user@userson.eu')
    await page.getByRole('button', { name: 'common.save' }).click()

    await expect(page.getByText('pages.users.index.heading')).toBeVisible()
    await expect(page.getByText('user@userson.eu')).toBeVisible()

    // Delete
    const userNameElement = page.getByText('User Userson')
    const userRowElement = userNameElement.locator('..')
    const userDeleteButton = userRowElement.getByRole('button', {
      name: 'common.delete',
    })

    page.on('dialog', (dialog) => dialog.accept())
    await userDeleteButton.click()

    await expect(userDeleteButton).not.toBeVisible()
    await expect(page.getByText('User Userson')).not.toBeVisible()
  })
})
