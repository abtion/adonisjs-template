import { Head } from '@inertiajs/react'
import Button from '~/components/Button'
import Alert from '~/components/Alert'
import Input from '~/components/Input'
import { ChangeEvent, FormEvent } from 'react'
import { useForm } from '@inertiajs/react'
import MainLayout from '~/layouts/main'

export default function UsersCreate() {
  const { data, setData, post, processing, errors } = useForm({
    name: '',
    email: '',
    password: '',
  })

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    post('/users')
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    setData(event.currentTarget.name as keyof typeof data, event.currentTarget.value)
  }

  return (
    <MainLayout>
      <Head title="New user" />

      <div className="container my-10">
        <form action="/users" method="post" onSubmit={handleSubmit}>
          <h1 className="text-2xl">Create new user</h1>

          <div className="w-80 mt-4">
            <label>
              <p className="font-medium text-lg">Name</p>
              <Input
                className="w-full mt-2"
                autoComplete="off"
                size="md"
                type="text"
                name="name"
                variant={errors.name ? 'error' : 'default'}
                value={data.name}
                onChange={handleChange}
                placeholder="The name of the user"
              />
            </label>

            {errors.name && (
              <Alert variant="danger" className="mt-2">
                {errors.name}
              </Alert>
            )}
          </div>

          <div className="w-80 mt-4">
            <label>
              <p className="font-medium text-lg">Email</p>
              <Input
                className="w-full mt-2"
                autoComplete="off"
                size="md"
                type="text"
                name="email"
                variant={errors.email ? 'error' : 'default'}
                value={data.email}
                onChange={handleChange}
                placeholder="The user's email"
              />
            </label>

            {errors.email && (
              <Alert variant="danger" className="mt-2">
                {errors.email}
              </Alert>
            )}
          </div>

          <div className="w-80 mt-4">
            <label>
              <p className="font-medium text-lg">Password</p>
              <Input
                className="w-full mt-2"
                autoComplete="new-password"
                size="md"
                type="password"
                name="password"
                variant={errors.password ? 'error' : 'default'}
                value={data.password}
                onChange={handleChange}
                placeholder="Password - can be changed later"
              />
            </label>

            {errors.password && (
              <Alert variant="danger" className="mt-2">
                {errors.password}
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
