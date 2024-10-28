import UsersController from '#controllers/users_controller'
import { InferPageProps } from '@adonisjs/inertia/types'
import { Link } from '@inertiajs/react'
import Button from '~/components/Button'
import ButtonClear from '~/components/ButtonClear'
import MainLayout from '~/layouts/main'

export default function UserShow({ user, policies }: InferPageProps<UsersController, 'show'>) {
  return (
    <MainLayout>
      <div className="container mx-auto my-20 max-w-3xl">
        <div className="flex items-center">
          <h1 className="text-3xl flex-grow">{user.email}</h1>
          {policies.UserPolicy.index && (
            <Link
              href="/users/"
              className={ButtonClear.cn(
                {
                  size: 'sm',
                  variant: 'primary',
                  disabled: !policies.UserPolicy.index,
                },
                'mr-2'
              )}
            >
              Back
            </Link>
          )}
          {user.permissions.edit && (
            <Link
              href={`/users/${user.id}/edit`}
              className={ButtonClear.cn(
                {
                  size: 'sm',
                  variant: 'primary',
                  disabled: !user.permissions.edit,
                },
                'mr-2'
              )}
            >
              Edit
            </Link>
          )}
          {user.permissions.destroy && (
            <Link
              href={`/users/${user.id}`}
              className={Button.cn({ size: 'sm', variant: 'danger' })}
              disabled={!user.permissions.destroy}
              onBefore={() => confirm('Are you sure?')}
              as="button"
              method="delete"
            >
              Delete
            </Link>
          )}
        </div>

        <div className="overflow-hidden rounded border border-neutral-200 shadow-sm mt-10">
          <table className="min-w-full">
            <tbody>
              <tr className="even:bg-neutral-50 odd:bg-white">
                <th className="text-left text-neutral-500 text-xs uppercase font-medium px-6 py-3">
                  Email
                </th>
                <td className="text-sm text-neutral-800 font-medium px-3 py-2 whitespace-nowrap">
                  {user.email}
                </td>
              </tr>

              <tr className="even:bg-neutral-50 odd:bg-white">
                <th className="text-left text-neutral-500 text-xs uppercase font-medium px-6 py-3">
                  Name
                </th>
                <td className="text-sm text-neutral-800 font-medium px-3 py-2 whitespace-nowrap">
                  {user.name}
                </td>
              </tr>

              <tr className="even:bg-neutral-50 odd:bg-white">
                <th className="text-left text-neutral-500 text-xs uppercase font-medium px-6 py-3">
                  Created at
                </th>
                <td className="text-sm text-neutral-800 font-medium px-3 py-2 whitespace-nowrap">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </MainLayout>
  )
}
