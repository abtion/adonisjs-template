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
    return inertia.render('books/create', { book: { name: '' } })
  }

  /**
   * Handle form submission for the create action
   */
  async store({ inertia, request, response }: HttpContext) {
    const body = request.body()
    const { success, data, error } = await createBookValidator(body)

    if (success) {
      const author = await db().selectFrom('authors').select('id').executeTakeFirst()

      await db()
        .insertInto('books')
        .values({ ...data, createdAt: new Date(), updatedAt: new Date(), authorId: author!.id })
        .execute()

      return response.redirect('/books')
    } else {
      return inertia.render('books/create', {
        book: body,
        error: error.format(),
      })
    }
  }

  /**
   * Show individual record
   */
  async show({ request, response }: HttpContext) {}

  /**
   * Edit individual record
   */
  async edit({ params }: HttpContext) {}

  /**
   * Handle form submission for the edit action
   */
  async update({ params, request }: HttpContext) {}

  /**
   * Delete record
   */
  async destroy({ params, response }: HttpContext) {
    const bookId = params.id

    await db().deleteFrom('books').where('books.id', '=', bookId).execute()

    return response.redirect('/books')
  }
}
