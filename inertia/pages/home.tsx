import type BooksController from '#controllers/books_controller'
import { Head, Link } from '@inertiajs/react'
import { InertiaProps } from '#types/utils'

export default function Home({ books }: InertiaProps<BooksController['index']>) {
  return (
    <>
      <Head title="List of books" />

      <div className="container">
        <h1>Books are</h1>

        {books.map((book) => (
          <div>
            {book.author?.name}: {book.name}
          </div>
        ))}

        <Link href={'/books/create'}>Create new book</Link>
      </div>
    </>
  )
}
