import BookPolicy from '#policies/book_policy'
import { db } from '#services/db'
import { createBookValidator } from '#validators/books_validator'
import type { HttpContext } from '@adonisjs/core/http'
import { jsonObjectFrom } from 'kysely/helpers/postgres'

export default class BooksController {
  /**
   * Display a list of resource
   */
  async index({ inertia, bouncer }: HttpContext) {
    await bouncer.with(BookPolicy).authorize('index')

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
  async create({ inertia, bouncer }: HttpContext) {
    await bouncer.with(BookPolicy).authorize('create')

    return inertia.render('books/create')
  }

  /**
   * Handle form submission for the create action
   */
  async store({ request, response, bouncer }: HttpContext) {
    await bouncer.with(BookPolicy).authorize('create')

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
  async destroy({ params, response, bouncer }: HttpContext) {
    const book = await db()
      .selectFrom('books')
      .where('id', '=', params.id)
      .selectAll()
      .executeTakeFirstOrThrow()

    await bouncer.with(BookPolicy).authorize('delete', book)
    await db().deleteFrom('books').where('books.id', '=', book.id).execute()

    return response.redirect('/books')
  }
}
