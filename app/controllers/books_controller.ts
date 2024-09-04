import { db } from '#services/db'
import type { HttpContext } from '@adonisjs/core/http'
import { jsonObjectFrom } from 'kysely/helpers/postgres'
import z from 'zod'

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

    return inertia.render('home', { books })
  }

  /**
   * Display form to create a new record
   */
  async create({ inertia }: HttpContext) {
    return inertia.render('create', { book: { name: '' } })
  }

  /**
   * Handle form submission for the create action
   */
  async store({ inertia, request, response }: HttpContext) {
    const body = request.body()
    const { success, data, error } = await this.parsedCreateBody(body)

    if (success) {
      const author = await db().selectFrom('authors').select('id').executeTakeFirst()

      await db()
        .insertInto('books')
        .values({ ...data, createdAt: new Date(), updatedAt: new Date(), authorId: author!.id })
        .execute()

      return response.redirect('/books')
    } else {
      return inertia.render('create', { book: body, error: error.format() })
    }
  }

  /**
   * Show individual record
   */
  async show({ params }: HttpContext) {}

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
  async destroy({ params }: HttpContext) {}

  parsedCreateBody(body: any) {
    return z
      .object({
        name: z.string(),
      })
      .safeParseAsync(body)
  }
}
