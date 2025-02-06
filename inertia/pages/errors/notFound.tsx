import { Head } from '@inertiajs/react'
import { useTranslation } from 'react-i18next'
import MainLayout from '~/layouts/main'

export default function NotFound() {
  const { t } = useTranslation()

  return (
    <MainLayout>
      <Head title={t('pages.errors.notFound.title')} />
      <div className="container space-y-4 py-4">
        <h1 className="text-4xl">{t('pages.errors.notFound.heading')}</h1>
        <p>{t('pages.errors.notFound.description')}</p>
      </div>
    </MainLayout>
  )
}
