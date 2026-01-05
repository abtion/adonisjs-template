import { Head, router, useForm } from '@inertiajs/react'
import { startAuthentication } from '@simplewebauthn/browser'
import {
  AuthenticationResponseJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/types'
import { FormEvent, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Alert from '~/components/Alert'
import { BaseFormError } from '~/components/BaseFormError'
import Button from '~/components/Button'
import { FieldError } from '~/components/FieldError'
import Input from '~/components/Input'
import SessionLayout from '~/layouts/session'
import { tuyau } from '~/lib/tuyau'

interface Props {
  email: string
  hasWebauthn: boolean
  requiresOtp: boolean
  webauthnOptions: PublicKeyCredentialRequestOptionsJSON | null
}

export default function Authenticate({ email, webauthnOptions }: Props) {
  const { t } = useTranslation()
  const [webauthnAttempted, setWebauthnAttempted] = useState(false)

  const { data, setData, post, errors, processing } = useForm({
    password: null as string | null,
    assertion: null as AuthenticationResponseJSON | null,
  })

  async function authenticateWithWebauthn() {
    try {
      const assertion = await startAuthentication({ optionsJSON: webauthnOptions! })
      setData({ assertion, password: null })
    } catch (error) {
      setWebauthnAttempted(true)
    }
  }

  useEffect(() => {
    if (!data.assertion) return
    post(tuyau['sign-in']({ email }).$url())
  }, [data.assertion])

  useEffect(() => {
    if (webauthnOptions) authenticateWithWebauthn()
  }, [])

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    post(tuyau['sign-in']({ email }).$url())
  }

  const showPasswordField = !webauthnOptions || webauthnAttempted

  return (
    <SessionLayout>
      <Head title={t('pages.session.signIn.title')} />
      <div className="mx-auto w-full max-w-sm">
        <h2 className="mb-12 text-3xl font-semibold">{t('pages.session.signIn.heading')}</h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label>
              <p className="text-lg font-medium">{t('fields.email')}</p>
              <Input
                className="mt-2 w-full"
                size="md"
                type="text"
                name="email"
                variant="default"
                value={email}
                disabled
                autoComplete="email"
              />
            </label>
          </div>

          {webauthnAttempted && (
            <Alert variant="danger" className="mb-6">
              {t('pages.session.signIn.webauthnFailed')}
            </Alert>
          )}

          {showPasswordField && (
            <div className="mb-6">
              <label>
                <p className="text-lg font-medium">{t('fields.password')}</p>
                <Input
                  autoFocus
                  className="mt-2 w-full"
                  size="md"
                  type="password"
                  name="password"
                  autoComplete="current-password"
                  variant={errors.password ? 'error' : 'default'}
                  value={data.password || ''}
                  onChange={(e) => setData('password', e.target.value)}
                  placeholder={t('pages.session.signIn.passwordPlaceholder')}
                  disabled={processing}
                />
              </label>

              <FieldError error={errors.password} className="mt-2" />
            </div>
          )}

          <BaseFormError className="mb-6" />

          {showPasswordField && (
            <div className="actions mt-6">
              <Button
                type="submit"
                variant="primary"
                size="md"
                className="w-full"
                disabled={processing}
              >
                {processing
                  ? t('pages.session.signIn.signingIn')
                  : t('pages.session.signIn.signIn')}
              </Button>
            </div>
          )}

          {webauthnOptions && webauthnAttempted && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => authenticateWithWebauthn()}
                disabled={processing}
                className="text-sm text-primary-600 underline hover:text-primary-700"
              >
                {t('pages.session.signIn.tryWebauthnAgain')}
              </button>
            </div>
          )}

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => router.visit('/sign-in')}
              className="text-sm text-gray-600 underline hover:text-gray-800"
            >
              {t('pages.session.signIn.back')}
            </button>
          </div>
        </form>
      </div>
    </SessionLayout>
  )
}
