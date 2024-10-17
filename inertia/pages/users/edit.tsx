import { Head } from '@inertiajs/react'
import { ChangeEvent, FormEvent } from 'react'
import { useForm } from '@inertiajs/react'
import MainLayout from '~/layouts/main'
import UserForm from '~/components/UserForm'
import UsersController from '#controllers/users_controller'
import { InferPageProps } from '@adonisjs/inertia/types'

export default function UsersEdit({ user }: InferPageProps<UsersController, 'edit'>) {
  const { data, setData, put, processing, errors } = useForm({
    name: user.name,
    email: user.email,
    password: '',
  })

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    put(`/users/${user.id}`)
  }

  function handleChange(event: ChangeEvent<{ name: string; value: string }>) {
    setData(event.currentTarget.name as keyof typeof data, event.currentTarget.value)
  }

  return (
    <MainLayout>
      <Head title="New user" />

      <div className="container my-10">
        <h1 className="text-2xl">Edit {user.name}</h1>

        <UserForm
          isEdit
          data={data}
          processing={processing}
          errors={errors}
          action="/users"
          className="mt-4"
          method="post"
          onChange={handleChange}
          onSubmit={handleSubmit}
        />
      </div>
    </MainLayout>
  )
}
