import { SharedProps } from '@adonisjs/inertia/types'
import { Head, router, useForm, usePage } from '@inertiajs/react'
import { ChangeEvent, FormEvent, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { startAuthentication } from '@simplewebauthn/browser'
import Alert from '~/components/Alert'
import Button from '~/components/Button'
import Input from '~/components/Input'
import SessionLayout from '~/layouts/session'
import { tuyau } from '~/lib/tuyau'
import { useAutofillRef } from '~/hooks/useAutofillRef'
import { FieldError, FormError } from '~/components/FieldError'
import { BaseFormError } from '~/components/BaseFormError'

export default function SignIn() {
  const { t } = useTranslation()
  const [emailChecked, setEmailChecked] = useState(false)
  const [authInfo, setAuthInfo] = useState<{ hasWebauthn: boolean; requiresOtp: boolean } | null>(
    null
  )
  const [webauthnError, setWebauthnError] = useState<boolean>(false)
  const [webauthnBusy, setWebauthnBusy] = useState(false)
  const [checkingEmail, setCheckingEmail] = useState(false)
  const [showPasswordFallback, setShowPasswordFallback] = useState(false)

  const { data, setData, post, processing, errors, clearErrors } = useForm({
    email: '',
    password: '',
  })

  async function handleEmailSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()

    // If password field is shown, submit the full form
    if ((emailChecked && showPasswordFallback) || !data.email) {
      handlePasswordSubmit(e)
      return
    }

    setCheckingEmail(true)
    setWebauthnError(false)
    clearErrors()

    try {
      const info = await tuyau.session.options({ email: data.email }).$get().unwrap()

      setAuthInfo(info)
      setEmailChecked(true)

      if (info.hasWebauthn) {
        await handleWebauthn()
      } else {
        setShowPasswordFallback(true)
      }
    } catch (err) {
      console.error(err)
      setWebauthnError(true)
      setShowPasswordFallback(true)
    } finally {
      setCheckingEmail(false)
    }
  }

  function handlePasswordSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    post('/session')
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    setData(event.currentTarget.name as keyof typeof data, event.currentTarget.value)
  }

  useEffect(() => {
    setEmailChecked(false)
    setAuthInfo(null)
    setShowPasswordFallback(false)
    setWebauthnError(false)
  }, [data.email])

  async function handleWebauthn() {
    setWebauthnBusy(true)
    setWebauthnError(false)
    try {
      if (!data.email) {
        throw new Error('Email is required')
      }
      const options = await tuyau.session.webauthn({ email: data.email }).$get().unwrap()
      const assertion = await startAuthentication({ optionsJSON: options })

      await tuyau.session.webauthn({ email: data.email }).$post({ assertion }).unwrap()
      router.visit('/')
    } catch (err) {
      console.error(err)
      setWebauthnError(true)
      setWebauthnBusy(false)
      setShowPasswordFallback(true)
    }
  }

  return (
    <SessionLayout>
      <Head title={t('pages.session.signIn.title')} />
      <div className="mx-auto w-full max-w-sm">
        <h2 className="mb-12 text-3xl font-semibold">{t('pages.session.signIn.heading')}</h2>

        <form onSubmit={handleEmailSubmit}>
          <div className="mb-6">
            <label>
              <p className="text-lg font-medium">{t('fields.email')}</p>
              <Input
                autoFocus
                className="mt-2 w-full"
                size="md"
                type="text"
                name="email"
                variant={errors.email ? 'error' : 'default'}
                value={data.email}
                onChange={handleChange}
                placeholder={t('pages.session.signIn.emailPlaceholder')}
                autoComplete="email"
                disabled={webauthnBusy}
                ref={useAutofillRef<HTMLInputElement>(({ value }) => setData('email', value))}
              />
            </label>

            <FieldError error={errors.email} className="mt-2" />
          </div>

          {showPasswordFallback && (
            <div className="mb-6">
              <label>
                <p className="text-lg font-medium">{t('fields.password')}</p>
                <Input
                  className="mt-2 w-full"
                  size="md"
                  type="password"
                  name="password"
                  autoComplete="current-password"
                  variant={errors.password ? 'error' : 'default'}
                  value={data.password}
                  onChange={handleChange}
                  placeholder={t('pages.session.signIn.passwordPlaceholder')}
                  disabled={processing || webauthnBusy}
                />
              </label>

              <FieldError error={errors.password} className="mt-2" />
            </div>
          )}

          {webauthnBusy && !showPasswordFallback && (
            <div className="text-gray-600 mb-6 text-center text-sm">
              {t('pages.session.signIn.awaitingWebauthn')}
            </div>
          )}

          {/* Error messages */}
          {webauthnError && (
            <Alert variant="danger" className="mb-6">
              {t('pages.session.signIn.webauthnFailed')}
            </Alert>
          )}

          <BaseFormError className="mb-6" />

          {/* Submit button */}
          <div className="actions mt-6">
            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full"
              disabled={checkingEmail || processing || webauthnBusy}
            >
              {checkingEmail
                ? t('pages.session.signIn.checkingEmail')
                : webauthnBusy
                  ? t('pages.session.signIn.signingIn')
                  : showPasswordFallback
                    ? t('pages.session.signIn.signIn')
                    : t('pages.session.signIn.continue')}
            </Button>
          </div>

          {authInfo?.hasWebauthn && !showPasswordFallback && webauthnError && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setShowPasswordFallback(true)}
                className="text-sm text-primary-600 underline hover:text-primary-700"
              >
                {t('pages.session.signIn.usePasswordInstead')}
              </button>
            </div>
          )}
        </form>
      </div>
    </SessionLayout>
  )
}
