import { SharedProps } from '@adonisjs/inertia/types'
import { Head, useForm, usePage } from '@inertiajs/react'
import { ChangeEvent, FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { startAuthentication } from '@simplewebauthn/browser'
import Alert from '~/components/Alert'
import Button from '~/components/Button'
import Input from '~/components/Input'
import SessionLayout from '~/layouts/session'
import { postJson, getCsrfToken } from '~/lib/api'

export default function SignIn() {
  const { t } = useTranslation()
  const [emailChecked, setEmailChecked] = useState(false)
  const [authInfo, setAuthInfo] = useState<{ hasPasskeys: boolean; requiresOtp: boolean } | null>(
    null
  )
  const [passkeyError, setPasskeyError] = useState<string | null>(null)
  const [passkeyBusy, setPasskeyBusy] = useState(false)
  const [checkingEmail, setCheckingEmail] = useState(false)
  const [showPasswordFallback, setShowPasswordFallback] = useState(false)

  const {
    props: { exceptions },
  } = usePage<SharedProps>()

  const { data, setData, post, processing, errors } = useForm({
    email: '',
    password: '',
  })

  async function handleEmailSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()

    // If password field is shown, submit the full form
    if (emailChecked && showPasswordFallback) {
      handlePasswordSubmit(e)
      return
    }

    // Otherwise, check email and handle passkey or show password
    setCheckingEmail(true)
    setPasskeyError(null)

    try {
      const info = await postJson<{
        exists: boolean
        hasPasskeys?: boolean
        requiresOtp?: boolean
      }>('/sign-in/check-email', { email: data.email })

      // Always proceed to password entry to prevent user enumeration
      // Server always returns exists: true to prevent enumeration
      // If account doesn't exist, authentication will fail with generic error on server side
      setAuthInfo({
        hasPasskeys: info.hasPasskeys || false,
        requiresOtp: info.requiresOtp || false,
      })
      setEmailChecked(true)

      // If user has passkeys, auto-trigger passkey authentication
      if (info.hasPasskeys) {
        await handlePasskey()
      } else {
        // No passkeys or account doesn't exist, show password field
        // Server-side authentication will handle invalid credentials generically
        setShowPasswordFallback(true)
      }
    } catch (err) {
      const errorMessage = (err as Error).message
      // Show validation errors (like "Email is required") but proceed to password entry
      // Don't reveal account existence errors to prevent enumeration
      if (errorMessage.includes('Email is required') || errorMessage.includes('required')) {
        setPasskeyError(errorMessage)
      }
      // Always show password fallback to allow authentication attempt
      setShowPasswordFallback(true)
    } finally {
      setCheckingEmail(false)
    }
  }

  function handlePasswordSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    post('/sign-in')
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    setData(event.currentTarget.name as keyof typeof data, event.currentTarget.value)
    // Reset state when email changes
    if (event.currentTarget.name === 'email') {
      setEmailChecked(false)
      setAuthInfo(null)
      setShowPasswordFallback(false)
      setPasskeyError(null)
    }
  }

  async function handlePasskey() {
    setPasskeyBusy(true)
    setPasskeyError(null)
    try {
      if (!data.email) {
        throw new Error('Email is required')
      }
      const { options } = await postJson<{ options: any }>('/passwordless/options', {
        email: data.email,
      })
      const assertion = await startAuthentication(options)
      const res = await fetch('/passwordless/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-XSRF-TOKEN': getCsrfToken(),
        },
        body: JSON.stringify({ assertion }),
        redirect: 'follow',
      })
      if (res.ok || res.redirected) {
        window.location.href = res.url || '/'
      } else {
        const data = await res.json().catch(() => ({}))
        throw new Error((data as any).message || 'Authentication failed')
      }
    } catch (err) {
      setPasskeyError((err as Error).message)
      setPasskeyBusy(false)
      // On passkey failure, show password fallback
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
                className="mt-2 w-full"
                size="md"
                type="text"
                name="email"
                variant={errors.email ? 'error' : 'default'}
                value={data.email}
                onChange={handleChange}
                placeholder={t('pages.session.signIn.emailPlaceholder')}
                autoComplete="email"
                disabled={passkeyBusy}
              />
            </label>

            {errors.email && (
              <Alert variant="danger" className="mt-2">
                {errors.email}
              </Alert>
            )}
          </div>

          {/* Show password field if no passkeys or passkey failed */}
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
                  disabled={processing || passkeyBusy}
                />
              </label>

              {errors.password && (
                <Alert variant="danger" className="mt-2">
                  {errors.password}
                </Alert>
              )}
            </div>
          )}

          {/* Show passkey status */}
          {passkeyBusy && !showPasswordFallback && (
            <div className="text-gray-600 mb-6 text-center text-sm">Waiting for passkey...</div>
          )}

          {/* Error messages */}
          {passkeyError && (
            <Alert variant="danger" className="mb-6">
              {passkeyError}
            </Alert>
          )}

          {exceptions['E_INVALID_CREDENTIALS'] && (
            <Alert variant="danger" className="mb-6">
              {t(`pages.session.signIn.${exceptions['E_INVALID_CREDENTIALS']}`)}
            </Alert>
          )}

          {/* Submit button */}
          <div className="actions mt-6">
            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full"
              disabled={checkingEmail || processing || passkeyBusy}
            >
              {checkingEmail
                ? 'Checking...'
                : passkeyBusy
                  ? 'Signing in...'
                  : showPasswordFallback
                    ? t('pages.session.signIn.signIn')
                    : 'Continue'}
            </Button>
          </div>

          {/* Fallback link if passkey is being attempted */}
          {authInfo?.hasPasskeys && !showPasswordFallback && passkeyError && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setShowPasswordFallback(true)}
                className="text-sm text-primary-600 underline hover:text-primary-700"
              >
                Use password instead
              </button>
            </div>
          )}
        </form>
      </div>
    </SessionLayout>
  )
}
