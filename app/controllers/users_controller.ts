import UserPolicy from '#policies/user_policy'
import { db } from '#services/db'
import { createUserValidator } from '#validators/users_validator'
import type { HttpContext } from '@adonisjs/core/http'
import hash from '@adonisjs/core/services/hash'

export default class UsersController {
  /**
   * Display a list of resource
   */
  async index({ inertia, bouncer }: HttpContext) {
    await bouncer.with(UserPolicy).authorize('index')

    const users = await db()
      .selectFrom('users')
      .select(['id', 'email', 'name', 'createdAt'])
      .execute()

    return inertia.render('users/index', { users })
  }

  /**
   * Display form to create a new record
   */
  async create({ inertia, bouncer }: HttpContext) {
    await bouncer.with(UserPolicy).authorize('create')

    return inertia.render('users/create')
  }

  /**
   * Handle form submission for the create action
   */
  async store({ request, response, bouncer }: HttpContext) {
    await bouncer.with(UserPolicy).authorize('create')

    const data = await request.validateUsing(createUserValidator)

    await db()
      .insertInto('users')
      .values({
        ...data,
        password: await hash.make(data.password),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .execute()

    return response.redirect('/users')
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
    const user = await db()
      .selectFrom('users')
      .where('id', '=', params.id)
      .select('id')
      .executeTakeFirstOrThrow()

    await bouncer.with(UserPolicy).authorize('delete', user)
    await db().deleteFrom('users').where('users.id', '=', user.id).execute()

    return response.redirect('/users')
  }
}
