import type UsersController from '#controllers/users_controller'
import { Head, Link } from '@inertiajs/react'
import Button from '~/components/Button'
import ButtonClear from '~/components/ButtonClear'
import { InferPageProps } from '@adonisjs/inertia/types'
import MainLayout from '~/layouts/main'

export default function UsersIndex({ users }: InferPageProps<UsersController, 'index'>) {
  return (
    <MainLayout>
      <Head title="List of users" />

      <div className="container my-10">
        <h1 className="text-2xl">List of users</h1>

        <div className="w-80 mt-4 flex flex-col gap-2">
          {users.map((user) => (
            <div key={user.id} className="flex items-start justify-between">
              <h3 className="text-lg font-medium">{user.name}</h3>
              <Link
                href={`/users/${user.id}`}
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
          <Link href="/users/create" className={Button.cn({ size: 'sm', variant: 'primary' })}>
            Create user
          </Link>
        </div>
      </div>
    </MainLayout>
  )
}
