import { useState, useEffect } from 'react'
import { startAuthentication } from '@simplewebauthn/browser'
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
  hasWebauthn: boolean
}

export default function SecurityConfirmation({
  isOpen,
  onClose,
  onConfirmed,
  hasWebauthn,
}: SecurityConfirmationProps) {
  const { t } = useTranslation()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [usingWebauthn, setUsingWebauthn] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      setPassword('')
      setError(null)
      setUsingWebauthn(false)
    }
  }, [isOpen])

  const handlePasswordConfirm = async () => {
    setBusy(true)
    setError(null)
    try {
      await tuyau.profile['confirm-security'].$post({ password }).unwrap()
      onConfirmed()
      onClose()
    } catch (err) {
      setError(err?.value?.message ?? t('errors.fallbackError'))
    } finally {
      setBusy(false)
    }
  }

  const handleWebauthnConfirm = async () => {
    setBusy(true)
    setError(null)
    try {
      const { options } = await tuyau.profile['confirm-security'].$get().unwrap()

      const assertion = await startAuthentication({
        optionsJSON: options as PublicKeyCredentialRequestOptionsJSON,
      })
      await tuyau.profile['confirm-security'].$post({ assertion }).unwrap()
      onConfirmed()
      onClose()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 !mt-0 flex items-center justify-center bg-black bg-opacity-50">
      <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-xl font-semibold">{t('components.securityConfirmation.title')}</h2>
        <p className="text-gray-600 mb-6 text-sm">
          {t('components.securityConfirmation.description')}
        </p>

        {!usingWebauthn ? (
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium">
                {t('components.securityConfirmation.passwordLabel')}
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('components.securityConfirmation.passwordPlaceholder')}
                autoComplete="current-password"
                size="md"
                className="w-full"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && password && !busy) {
                    handlePasswordConfirm()
                  }
                }}
              />
            </div>
            <div className="flex gap-3">
              <Button
                onClick={handlePasswordConfirm}
                variant="primary"
                size="md"
                disabled={busy || !password}
                className="flex-1"
              >
                {t('components.securityConfirmation.confirmButton')}
              </Button>
              <Button onClick={onClose} variant="neutral" size="md" disabled={busy}>
                {t('components.securityConfirmation.cancelButton')}
              </Button>
            </div>
            {hasWebauthn && (
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => setUsingWebauthn(true)}
                  disabled={busy}
                  className="text-blue-600 hover:text-blue-800 disabled:text-gray-400 text-sm"
                >
                  {t('components.securityConfirmation.useWebauthnInstead')}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-gray-600 text-sm">
              {t('components.securityConfirmation.webauthnDescription')}
            </p>
            <div className="flex gap-3">
              <Button
                onClick={handleWebauthnConfirm}
                variant="primary"
                size="md"
                disabled={busy}
                className="flex-1"
              >
                {busy
                  ? t('components.securityConfirmation.verifying')
                  : t('components.securityConfirmation.useWebauthnButton')}
              </Button>
              <Button
                onClick={() => setUsingWebauthn(false)}
                variant="neutral"
                size="md"
                disabled={busy}
              >
                {t('components.securityConfirmation.backButton')}
              </Button>
            </div>
          </div>
        )}

        {error && (
          <Alert variant="danger" className="mt-6">
            {error}
          </Alert>
        )}
      </div>
    </div>
  )
}
