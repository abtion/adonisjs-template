import { Head } from '@inertiajs/react'
import { useTranslation } from 'react-i18next'
import MainLayout from '~/layouts/main'
import Totp from '~/components/Profile/Totp'
import Webauthn from '~/components/Profile/Webauthn'
import ProfileController from '#controllers/profile_controller'
import { InferPageProps } from '@adonisjs/inertia/types'

export default function ProfilePage({
  user,
  totp,
  credentials,
}: InferPageProps<ProfileController, 'show'>) {
  const { t } = useTranslation()

  return (
    <MainLayout>
      <Head title={t('pages.profile.title')} />
      <div className="container my-20 space-y-6">
        <div>
          <h1 className="text-3xl">{t('pages.profile.heading')}</h1>
          <p className="text-gray-600 text-sm mt-4">{t('pages.profile.description')}</p>
        </div>

        <div className="rounded-md border border-neutral-300 p-4 mt-10">
          <h2 className="mb-2 text-xl">{t('pages.profile.accountTitle')}</h2>
          <p className="text-gray-700 text-sm">
            {t('pages.profile.signedInAs', { name: user.name, email: user.email })}
          </p>
        </div>

        <Webauthn credentials={credentials} />

        <Totp enabled={totp.enabled} recoveryCodesCount={totp.recoveryCodesCount} />
      </div>
    </MainLayout>
  )
}
