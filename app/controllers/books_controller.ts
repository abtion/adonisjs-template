import { db } from '#services/db'
import { createBookValidator } from '#validators/books_validator'
import type { HttpContext } from '@adonisjs/core/http'
import { jsonObjectFrom } from 'kysely/helpers/postgres'

export default class BooksController {
  /**
   * Display a list of resource
   */
  async index({ inertia }: HttpContext) {
    const books = await db()
      .selectFrom('books')
      .selectAll()
      .select((eb) => [
        jsonObjectFrom(
          eb.selectFrom('authors').selectAll().whereRef('id', '=', 'books.authorId')
        ).as('author'),
      ])
      .execute()

    return inertia.render('books/index', { books })
  }

  /**
   * Display form to create a new record
   */
  async create({ inertia }: HttpContext) {
    return inertia.render('books/create')
  }

  /**
   * Handle form submission for the create action
   */
  async store({ request, response }: HttpContext) {
    const data = await request.validateUsing(createBookValidator)
    const author = await db().selectFrom('authors').select('id').executeTakeFirst()

    await db()
      .insertInto('books')
      .values({ ...data, createdAt: new Date(), updatedAt: new Date(), authorId: author!.id })
      .execute()

    return response.redirect('/books')
  }

  /**
   * Show individual record
   */
  async show(_: HttpContext) {}

  /**
   * Edit individual record
   */
  async edit(_: HttpContext) {}

  /**
   * Handle form submission for the edit action
   */
  async update(_: HttpContext) {}

  /**
   * Delete record
   */
  async destroy({ params, response }: HttpContext) {
    const bookId = params.id

    await db().deleteFrom('books').where('books.id', '=', bookId).execute()

    return response.redirect('/books')
  }
}
