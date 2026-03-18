import { Head } from '@inertiajs/react'
import { FormEvent, ChangeEvent } from 'react'
import { useForm } from '@inertiajs/react'
import MainLayout from '~/layouts/main'
import { useTranslation } from 'react-i18next'
import { SharedProps } from '@adonisjs/inertia/types'
import { Selectable } from 'kysely'
import type { Users } from '#database/types'
import { urlFor } from '~/client'
import type { WithPermissions } from '#middleware/permissions_middleware'
import UserForm from '~/components/UserForm'

type Props = SharedProps & {
  user: WithPermissions<Pick<Selectable<Users>, 'id' | 'name' | 'email'>>
}

export default function UsersEdit({ user }: Props) {
  const { t } = useTranslation()

  const { data, setData, put, processing, errors } = useForm({
    name: user.name,
    email: user.email,
    password: '',
  })

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    put(urlFor('users.update', { id: user.id }))
  }

  function handleChange(event: ChangeEvent<{ name: string; value: string }>) {
    setData(event.currentTarget.name as keyof typeof data, event.currentTarget.value)
  }

  return (
    <MainLayout>
      <Head title={t('pages.users.edit.title')} />

      <div className="container my-10">
        <h1 className="text-2xl">{t('pages.users.edit.heading', { name: user.name })}</h1>

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
