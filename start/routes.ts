/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'
import { db } from '#services/db'

export const presenter = async () => {
  const book = await db()
    .selectFrom('books')
    .innerJoin('authors', 'authors.id', 'books.authorId')
    .selectAll()
    .select('authors.name as authorName')
    .executeTakeFirst()

  return {
    title: 'Testing',
    version: 'testing',
    book,
  }
}

router.get('/', async ({ inertia }) => {
  return inertia.render('home', await presenter())
})
