import { db, withGlobalTransaction } from '#services/db'
import { test } from '@japa/runner'

test.group('Home page', (group) => {
  group.each.setup(() => withGlobalTransaction())

  test('see welcome message', async ({ visit }) => {
    const author = await db()
      .insertInto('authors')
      .values({ name: 'John', created_at: new Date(), updated_at: new Date() })
      .returningAll()
      .executeTakeFirst()

    await db()
      .insertInto('books')
      .values({
        author_id: author!.id,
        name: "John's book",
        created_at: new Date(),
        updated_at: new Date(),
      })
      .executeTakeFirst()

    const page = await visit('/')

    await page.assertTextContains('h1', 'John')
  })
})
