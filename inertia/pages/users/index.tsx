import type UsersController from '#controllers/users_controller'
import { Head, Link } from '@inertiajs/react'
import Button from '~/components/Button'
import ButtonClear from '~/components/ButtonClear'
import { InferPageProps } from '@adonisjs/inertia/types'
import MainLayout from '~/layouts/main'

export default function UsersIndex({ users, policies }: InferPageProps<UsersController, 'index'>) {
  return (
    <MainLayout>
      <Head title="List of users" />

      <div className="container mx-auto my-20">
        <div className="flex items-center">
          <h1 className="text-3xl flex-grow">List of users</h1>

          {policies.UserPolicy.create && (
            <Link href="/users/create" className={Button.cn({ size: 'sm', variant: 'primary' })}>
              Create user
            </Link>
          )}
        </div>

        <div className="overflow-hidden rounded border border-neutral-200 shadow-sm mt-10">
          <table className="min-w-full">
            <thead className="border-b border-b-neutral-200">
              <tr className="bg-neutral-50">
                <th className="text-left text-neutral-500 text-xs uppercase font-medium px-6 py-3">
                  Email
                </th>
                <th className="text-left text-neutral-500 text-xs uppercase font-medium px-6 py-3">
                  Name
                </th>
                <th className="text-left text-neutral-500 text-xs uppercase font-medium px-6 py-3">
                  Created at
                </th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="even:bg-neutral-50 odd:bg-white">
                  <td className="text-sm text-neutral-800 font-medium px-3 py-2 whitespace-nowrap">
                    <Link
                      href={`/users/${user.id}`}
                      className={ButtonClear.cn({ size: 'sm', variant: 'primary' })}
                      disabled={!user.permissions.show}
                    >
                      {user.email}
                    </Link>
                  </td>
                  <td className="text-sm text-neutral-500 px-6 py-4 whitespace-nowrap">
                    {user.name}
                  </td>
                  <td className="text-sm text-neutral-500 px-6 py-4 whitespace-nowrap">
                    {new Date(user.createdAt).toLocaleDateString('en-US')}
                  </td>
                  <td className="px-3 py-2 flex justify-end">
                    <Link
                      href={`/users/${user.id}`}
                      className={ButtonClear.cn({ size: 'sm', variant: 'primary' })}
                      disabled={!user.permissions.edit}
                    >
                      Edit
                    </Link>
                    <Link
                      href={`/users/${user.id}`}
                      method="delete"
                      as="button"
                      onBefore={() => confirm('Are you sure?')}
                      className={ButtonClear.cn({ size: 'sm', variant: 'danger' })}
                      disabled={!user.permissions.destroy}
                    >
                      Delete
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </MainLayout>
  )
}
