import { db } from '#services/db'
import type { HttpContext } from '@adonisjs/core/http'
import z from 'zod'

const storeDto = z.object({
  name: z.string(),
})

export default class BooksController {
  /**
   * Display a list of resource
   */
  async index({ inertia }: HttpContext) {
    const books = await db()
      .selectFrom('books')
      .innerJoin('authors', 'authors.id', 'books.authorId')
      .selectAll()
      .select('authors.name as authorName')
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
  async store({ inertia, params }: HttpContext & { params: z.infer<typeof storeDto> }) {
    console.log('yay!')
    const book = storeDto.parse(params)
    return inertia.render('create', { book })
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
}
