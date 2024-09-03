/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'
import BooksController from '#controllers/books_controller'

router.resource('books', BooksController)

router.get('/', async ({ response }) => {
  response.redirect('/books')
})
