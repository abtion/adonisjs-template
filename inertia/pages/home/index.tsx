import { Head } from '@inertiajs/react'
import { useTranslation } from 'react-i18next'
import MainLayout from '~/layouts/main'

export default function UsersIndex() {
  const { t } = useTranslation()

  return (
    <MainLayout>
      <Head title="Home" />
      <div className="container mx-auto">
        <h1 className="text-xl mt-10">{t('projectName')}</h1>
      </div>
    </MainLayout>
  )
}
