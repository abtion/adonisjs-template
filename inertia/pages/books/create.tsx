import { Head } from '@inertiajs/react'
import Button from '~/components/Button'
import Alert from '~/components/Alert'
import Input from '~/components/Input'
import { ChangeEvent, FormEvent } from 'react'
import { useForm } from '@inertiajs/react'
import MainLayout from '~/layouts/main'

export default function BooksCreate() {
  const { data, setData, post, processing, errors } = useForm({
    name: '',
  })

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    post('/books')
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    setData(event.currentTarget.name as keyof typeof data, event.currentTarget.value)
  }

  return (
    <MainLayout>
      <Head title="New book" />

      <div className="container my-10">
        <form action="/books" method="post" onSubmit={handleSubmit}>
          <h1 className="text-2xl">Create new book</h1>

          <div className="w-80 mt-4">
            <label>
              <p className="font-medium text-lg">Name</p>
              <Input
                className="w-full mt-2"
                size="md"
                type="text"
                name="name"
                variant={errors.name ? 'error' : 'default'}
                value={data.name}
                onChange={handleChange}
                placeholder="The name of the book"
              />
            </label>

            {errors.name && (
              <Alert variant="danger" className="mt-2">
                {errors.name}
              </Alert>
            )}
          </div>

          <div className="mt-5">
            <Button size="md" variant="primary" disabled={processing} type="submit">
              Save
            </Button>
          </div>
        </form>
      </div>
    </MainLayout>
  )
}
