import { Head } from '@inertiajs/react'
import { useTranslation } from 'react-i18next'
import MainLayout from '~/layouts/main'

export default function ServerError({ error, requestId }: { error: any, requestId: any }) {
  const { t } = useTranslation()

  return (
    <MainLayout>
      <Head title={t('pages.errors.serverError.title')} />
      <div className="container space-y-4 py-4">
        <h1>{t('pages.errors.serverError.heading')}</h1>
        <p>{error.message}</p>
        <p className="text-xs text-info-500">{t('pages.errors.notFound.requestId', { requestId })}</p>
      </div>
    </MainLayout>
  )
}
