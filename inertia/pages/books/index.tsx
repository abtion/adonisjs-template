import type BooksController from '#controllers/books_controller'
import { Head, Link } from '@inertiajs/react'
import Button from '~/components/Button'
import ButtonClear from '~/components/ButtonClear'
import { InferPageProps } from '@adonisjs/inertia/types'

export default function Home({ books }: InferPageProps<BooksController, 'index'>) {
  return (
    <>
      <Head title="List of books" />

      <div className="container my-10">
        <h1 className="text-2xl">List of books</h1>

        <div className="w-80 mt-4 flex flex-col gap-2">
          {books.map((book) => (
            <div key={book.id} className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-medium">{book.name}</h3>
                <p className="font-light">{book.author?.name}</p>
              </div>
              <Link
                href={`/books/${book.id}`}
                method="delete"
                as="button"
                onBefore={() => confirm('Are you sure?')}
                className={ButtonClear.cn({ size: 'sm', variant: 'danger' })}
              >
                Delete
              </Link>
            </div>
          ))}
        </div>

        <div className="mt-5">
          <Link href="/books/create" className={Button.cn({ size: 'sm', variant: 'primary' })}>
            Create book
          </Link>
        </div>
      </div>
    </>
  )
}
