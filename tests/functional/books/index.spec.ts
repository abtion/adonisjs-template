import { test } from '@japa/runner'
import { db, withGlobalTransaction } from '#services/db'

test.group('Users list', (group) => {
  group.each.setup(() => withGlobalTransaction())

  test('get a list of users', async ({ client }) => {
    const author = await db()
      .insertInto('authors')
      .values({ name: 'John', createdAt: new Date(), updatedAt: new Date() })
      .returningAll()
      .executeTakeFirst()
    const book = await db()
      .insertInto('books')
      .values({
        name: 'The book',
        createdAt: new Date(),
        updatedAt: new Date(),
        authorId: author!.id,
      })
      .returningAll()
      .executeTakeFirst()

    const response = await client.get('/books').withInertia()

    response.assertStatus(200)
    response.assertBodyContains({
      props: {
        books: [
          {
            id: book?.id,
            name: book?.name,
          },
        ],
      },
    })
  })
})