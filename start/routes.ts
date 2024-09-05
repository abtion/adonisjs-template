/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'

// Remember to *always lazy load controllers*, otherwise hot module reload won't work
const BooksController = () => import('#controllers/books_controller')

router.resource('books', BooksController)

router.get('/', async ({ response }) => {
  response.redirect('/books')
})
