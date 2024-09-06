import { db, withGlobalTransaction } from '#services/db'
import { test } from '@japa/runner'
import { expect } from '@playwright/test'

test.group('Books', (group) => {
  group.each.setup(() => withGlobalTransaction())

  test('CRUD book', async ({ visit }) => {
    await db()
      .insertInto('authors')
      .values({ name: 'John', createdAt: new Date(), updatedAt: new Date() })
      .returningAll()
      .executeTakeFirst()

    const page = await visit('/')

    await expect(page.getByText('List of books')).toBeVisible()
    await page.getByRole('link', { name: 'Create book' }).click()

    await expect(page.getByText('New book')).toBeVisible()
    await page.getByLabel('Name').fill('A new book')
    await page.getByRole('button', { name: 'Save' }).click()

    await expect(page.getByText('List of books')).toBeVisible()
    page.on('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: 'Delete' }).click()

    await expect(page.getByRole('button', { name: 'Delete' })).not.toBeVisible()
  })
})
