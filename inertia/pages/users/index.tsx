import type UsersController from '#controllers/users_controller'
import { Head, Link } from '@inertiajs/react'
import Button from '~/components/Button'
import ButtonClear from '~/components/ButtonClear'
import { InferPageProps } from '@adonisjs/inertia/types'
import MainLayout from '~/layouts/main'
import { useTranslation } from 'react-i18next'

export default function UsersIndex({ users, policies }: InferPageProps<UsersController, 'index'>) {
  const { t } = useTranslation()

  return (
    <MainLayout>
      <Head title={t('pages.users.index.title')} />

      <div className="container mx-auto my-20">
        <div className="flex items-center">
          <h1 className="text-3xl grow">{t('pages.users.index.heading')}</h1>

          {policies.UserPolicy.create && (
            <Link href="/users/create" className={Button.cn({ size: 'sm', variant: 'primary' })}>
              {t('common.new')}
            </Link>
          )}
        </div>

        <div className="overflow-hidden rounded-sm border border-neutral-200 shadow-xs mt-10">
          <table className="min-w-full">
            <thead className="border-b border-b-neutral-200">
              <tr className="bg-neutral-50">
                <th className="text-left text-neutral-500 text-xs uppercase font-medium px-6 py-3">
                  {t('fields.email')}
                </th>
                <th className="text-left text-neutral-500 text-xs uppercase font-medium px-6 py-3">
                  {t('fields.name')}
                </th>
                <th className="text-left text-neutral-500 text-xs uppercase font-medium px-6 py-3">
                  {t('fields.createdAt')}
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
                      className={ButtonClear.cn({
                        size: 'sm',
                        variant: 'primary',
                        disabled: !user.permissions.show,
                      })}
                    >
                      {user.email}
                    </Link>
                  </td>
                  <td className="text-sm text-neutral-500 px-6 py-4 whitespace-nowrap">
                    {user.name}
                  </td>
                  <td className="text-sm text-neutral-500 px-6 py-4 whitespace-nowrap">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-2 flex justify-end">
                    <Link
                      href={`/users/${user.id}/edit`}
                      className={ButtonClear.cn({
                        size: 'sm',
                        variant: 'primary',
                        disabled: !user.permissions.edit,
                      })}
                    >
                      {t('common.edit')}
                    </Link>
                    <Link
                      href={`/users/${user.id}`}
                      method="delete"
                      as="button"
                      disabled={!user.permissions.destroy}
                      onBefore={() => confirm(t('common.areYouSure'))}
                      className={ButtonClear.cn({ size: 'sm', variant: 'danger' })}
                    >
                      {t('common.delete')}
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
