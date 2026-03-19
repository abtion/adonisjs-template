import { Head } from '@inertiajs/react'
import { useTranslation } from 'react-i18next'
import MainLayout from '~/layouts/main'
import Totp from '~/components/Profile/Totp'
import Webauthn from '~/components/Profile/Webauthn'
import type { WebauthnCredentials } from '#database/types'
import { Selectable } from 'kysely'
import { SharedProps } from '@adonisjs/inertia/types'

type Props = SharedProps & {
  totp: {
    enabled: boolean
    recoveryCodesCount: number
  }
  credentials: Pick<
    Selectable<WebauthnCredentials>,
    'id' | 'friendlyName' | 'createdAt' | 'updatedAt'
  >[]
}

export default function ProfilePage({ user, totp, credentials }: Props) {
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
            {t('pages.profile.signedInAs', { name: user!.name, email: user!.email })}
          </p>
        </div>

        <Webauthn credentials={credentials} />

        <Totp enabled={totp.enabled} recoveryCodesCount={totp.recoveryCodesCount} />
      </div>
    </MainLayout>
  )
}
