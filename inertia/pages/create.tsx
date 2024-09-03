import type BooksController from '#controllers/books_controller'
import { Head } from '@inertiajs/react'
import { InertiaProps } from '#types/utils'

export default function Create({ book }: InertiaProps<BooksController['create']>) {
  return (
    <>
      <Head title="List of books" />

      <form className="container" action="/books" method="post">
        <h1>Create new book</h1>

        <input
          type="text"
          name="name"
          defaultValue={book.name}
          placeholder="The name of the book"
        />

        <button type="submit">Save</button>
      </form>
    </>
  )
}
