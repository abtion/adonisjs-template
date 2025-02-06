import { Head } from '@inertiajs/react'
import { useTranslation } from 'react-i18next'
import MainLayout from '~/layouts/main'

export default function ServerError(props: { error: any }) {
  const { t } = useTranslation()

  return (
    <MainLayout>
      <Head title={t('pages.errors.serverError.title')} />
      <div className="container space-y-4 py-4">
        <h1>{t('pages.errors.serverError.heading')}</h1>
        <p>{props.error.message}</p>
      </div>
    </MainLayout>
  )
}
