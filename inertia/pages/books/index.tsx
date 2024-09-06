import type BooksController from '#controllers/books_controller'
import { Head, Link } from '@inertiajs/react'
import { InertiaProps } from '#types/utils'
import Button from '~/components/Button'

export default function Home({ books }: InertiaProps<BooksController['index']>) {
  return (
    <>
      <Head title="List of books" />

      <div className="container my-10">
        <h1 className="text-2xl">Books are</h1>

        <div className="w-80 mt-4 flex flex-col gap-2">
          {books.map((book) => (
            <div key={book.id}>
              <h3 className="text-lg font-medium">{book.name}</h3>
              <p className="font-light">{book.author?.name}</p>
            </div>
          ))}
        </div>

        <div className="mt-5">
          <Link href={'/books/create'}>
            <Button size="md" variant="primary">
              Create book
            </Button>
          </Link>
        </div>
      </div>
    </>
  )
}
