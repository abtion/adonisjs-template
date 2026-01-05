import { useState, useEffect, FormEvent } from 'react'
import { AuthenticationResponseJSON, startAuthentication } from '@simplewebauthn/browser'
import Button from '~/components/Button'
import Input from '~/components/Input'
import { tuyau } from '~/lib/tuyau'
import { PublicKeyCredentialRequestOptionsJSON } from '@simplewebauthn/types'
import { useTranslation } from 'react-i18next'
import Alert from '../Alert'

type SecurityConfirmationProps = {
  isOpen: boolean
  onClose: () => void
  onConfirmed: () => void
}

export default function SecurityConfirmation({
  isOpen,
  onClose,
  onConfirmed,
}: SecurityConfirmationProps) {
  const { t } = useTranslation()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [webauthnAttempted, setWebauthnAttempted] = useState(false)
  const [webauthnOptions, setWebauthnOptions] =
    useState<PublicKeyCredentialRequestOptionsJSON | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      setPassword('')
      setWebauthnOptions(null)
      setWebauthnAttempted(false)
      return
    }

    tuyau.session['confirm-security']
      .$get()
      .unwrap()
      .then(({ options }) => {
        if (!options) return
        setWebauthnOptions(options)
      })
  }, [isOpen])

  const confirm = async (
    params: { password: string } | { assertion: AuthenticationResponseJSON }
  ) => {
    setBusy(true)
    setError(null)
    try {
      await tuyau.session['confirm-security'].$post(params).unwrap()
      onConfirmed()
      onClose()
    } catch (err) {
      setError(err?.value?.message ?? t('errors.fallbackError'))
    } finally {
      setBusy(false)
    }
  }

  const confirmWithWebauthn = async () => {
    try {
      const assertion = await startAuthentication({
        optionsJSON: webauthnOptions!,
      })
      await confirm({ assertion })
    } finally {
      setWebauthnAttempted(true)
    }
  }

  const handlePaswordSubmit = (e: FormEvent) => {
    e.preventDefault()
    confirm({ password })
  }

  useEffect(() => {
    if (webauthnOptions) confirmWithWebauthn()
  }, [webauthnOptions])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 !mt-0 flex items-center justify-center bg-black bg-opacity-50">
      <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-xl font-semibold">{t('components.securityConfirmation.title')}</h2>
        <p className="text-gray-600 mb-6 text-sm">
          {t('components.securityConfirmation.description')}
        </p>

        <div className="space-y-4">
          <form onSubmit={handlePaswordSubmit} className="space-y-4">
            <label className="block">
              <p className="mb-2 text-sm font-medium">{t('fields.password')}</p>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('components.securityConfirmation.passwordPlaceholder')}
                autoComplete="current-password"
                size="md"
                className="w-full"
                autoFocus
              />
            </label>
            <div className="flex gap-3">
              <Button
                variant="primary"
                size="md"
                type="submit"
                disabled={busy || !password}
                className="flex-1"
              >
                {t('components.securityConfirmation.confirmButton')}
              </Button>
              <Button onClick={onClose} variant="neutral" size="md" disabled={busy}>
                {t('components.securityConfirmation.cancelButton')}
              </Button>
            </div>
          </form>
          {webauthnAttempted && (
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={confirmWithWebauthn}
                disabled={busy}
                className="text-blue-600 hover:text-blue-800 disabled:text-gray-400 text-sm"
              >
                {t('components.securityConfirmation.retryWebauthn')}
              </button>
            </div>
          )}
        </div>

        {error && (
          <Alert variant="danger" className="mt-6">
            {error}
          </Alert>
        )}
      </div>
    </div>
  )
}
