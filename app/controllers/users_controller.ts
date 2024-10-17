import UserPolicy from '#policies/user_policy'
import { db } from '#services/db'
import { createUserValidator } from '#validators/users_validator'
import type { HttpContext } from '@adonisjs/core/http'
import hash from '@adonisjs/core/services/hash'

export default class UsersController {
  /**
   * Display a list of resource
   */
  async index({ inertia, bouncer, permissions }: HttpContext) {
    await bouncer.with(UserPolicy).authorize('index')

    const users = await db()
      .selectFrom('users')
      .select(['id', 'email', 'name', 'createdAt'])
      .execute()

    return inertia.render('users/index', {
      users: await permissions.appendToList(users, UserPolicy),
    })
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
  async show({ params, inertia, bouncer, permissions }: HttpContext) {
    const user = await db()
      .selectFrom('users')
      .where('id', '=', params.id)
      .select(['id', 'email', 'name', 'createdAt'])
      .executeTakeFirstOrThrow()

    await bouncer.with(UserPolicy).authorize('show', user)

    return inertia.render('users/show', {
      user: await permissions.appendTo(user, UserPolicy),
    })
  }

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

    await bouncer.with(UserPolicy).authorize('destroy', user)
    await db().deleteFrom('users').where('users.id', '=', user.id).execute()

    return response.redirect('/users')
  }
}
