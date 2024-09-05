import type BooksController from '#controllers/books_controller'
import { Head } from '@inertiajs/react'
import { InertiaProps } from '#types/utils'
import Form from '~/components/form'

export default function Create(
  props: InertiaProps<BooksController['create']> | InertiaProps<BooksController['store']>
) {
  return (
    <>
      <Head title="List of books" />

      <Form className="container" action="/books" method="post">
        <h1>Create new book</h1>

        <input
          type="text"
          name="name"
          defaultValue={props.book.name}
          placeholder="The name of the book"
        />
        {'error' in props &&
          props.error.name?._errors &&
          props.error.name?._errors.map((error) => <div>{error}</div>)}

        <button type="submit">Save</button>
      </Form>
    </>
  )
}
