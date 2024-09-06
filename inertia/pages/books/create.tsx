import type BooksController from '#controllers/books_controller'
import { Head } from '@inertiajs/react'
import { InertiaProps } from '#types/utils'
import Form from '~/components/form'
import Button from '~/components/Button'
import Alert from '~/components/Alert'
import Input from '~/components/Input'
import { router } from '@inertiajs/react'
import { FormEvent } from 'react'

export default function Create(
  props: InertiaProps<BooksController['create']> | InertiaProps<BooksController['store']>
) {
  const error = 'error' in props ? props.error : null

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    router.post('/books', formData)
  }

  return (
    <>
      <Head title="New book" />

      <div className="container my-10">
        <Form action="/books" method="post" onSubmit={handleSubmit}>
          <h1 className="text-2xl">Create new book</h1>

          <div className="w-80 mt-4">
            <p className="font-medium text-lg">Name</p>

            <Input
              className="w-full mt-2"
              size="md"
              type="text"
              name="name"
              variant={error?.name ? 'error' : 'default'}
              defaultValue={props.book.name}
              placeholder="The name of the book"
            />

            {error?.name && (
              <Alert variant="danger" className="mt-2">
                {error.name._errors.map((error) => (
                  <p key={error}>{error}</p>
                ))}
              </Alert>
            )}
          </div>

          <div className="mt-5">
            <Button size="md" variant="primary" type="submit">
              Save
            </Button>
          </div>
        </Form>
      </div>
    </>
  )
}
