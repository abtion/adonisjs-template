import { useState } from 'react'
import { startRegistration } from '@simplewebauthn/browser'
import Button from '~/components/Button'
import SecurityConfirmation from '~/components/SecurityConfirmation'
import { tuyau, errorIsType } from '~/lib/tuyau'
import { router } from '@inertiajs/react'
import { PublicKeyCredentialCreationOptionsJSON } from '@simplewebauthn/types'
import { useTranslation } from 'react-i18next'
import FlashMessage from '../FlashMessage'

type Credential = {
  id: number
  friendlyName: string | null
  createdAt: string | Date
  lastUsed: string | Date
}

type WebauthnProps = {
  credentials: Credential[]
}

export default function Webauthn({ credentials }: WebauthnProps) {
  const { t } = useTranslation()
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [pendingAction, setPendingAction] = useState<(() => Promise<void>) | null>(null)

  const handle = async (fn: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    setStatus(null)
    try {
      await fn()
    } catch (err) {
      if (errorIsType(err, 'SecurityConfirmationRequiredError')) {
        setError(null)
        setPendingAction(() => fn)
        setShowConfirmation(true)
        setBusy(false)
        return
      }
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const handleConfirmed = () => {
    if (pendingAction) {
      pendingAction()
      setPendingAction(null)
    }
  }

  const registerCredential = () =>
    handle(async () => {
      const { options } = await tuyau.profile.webauthn.options.$get().unwrap()
      const attestation = await startRegistration({
        optionsJSON: options as PublicKeyCredentialCreationOptionsJSON,
      })
      await tuyau.profile.webauthn.$post({ attestation })
      setStatus(t('components.webauthn.credentialRegisteredSuccess'))
      router.reload({ only: ['credentials'] })
    })

  const removeCredential = (id: number) =>
    handle(async () => {
      await tuyau.profile.webauthn({ id }).$delete().unwrap()
      setStatus(t('components.webauthn.credentialRemovedSuccess'))
      router.reload({ only: ['credentials'] })
    })

  return (
    <>
      <SecurityConfirmation
        isOpen={showConfirmation}
        onClose={() => {
          setShowConfirmation(false)
          setPendingAction(null)
        }}
        onConfirmed={handleConfirmed}
      />
      <section className="rounded-md border border-neutral-300 p-4">
        <h2 className="mb-2 text-xl">{t('components.webauthn.title')}</h2>
        <p className="text-gray-600 mb-4 text-sm">{t('components.webauthn.description')}</p>

        {credentials.length === 0 ? (
          <div>
            <p className="text-gray-700 mb-4 text-sm">
              {t('components.webauthn.noCredentialsRegistered')}
            </p>
            <Button onClick={registerCredential} disabled={busy} variant="primary" size="md">
              {t('components.webauthn.registerCredentialButton')}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <ul className="space-y-2">
              {credentials.map((credential) => (
                <li
                  key={credential.id}
                  className="flex items-center justify-between rounded border border-neutral-300 p-3"
                >
                  <div>
                    <p className="font-medium">
                      {credential.friendlyName ||
                        t('components.webauthn.credentialName', { id: credential.id })}
                    </p>
                    <p className="text-gray-500 text-sm">
                      {t('components.webauthn.registered')}{' '}
                      {new Date(credential.createdAt).toLocaleDateString()}
                      {credential.lastUsed &&
                        ` | ${t('components.webauthn.lastUsed')} ${new Date(credential.lastUsed).toLocaleDateString()}`}
                    </p>
                  </div>
                  <Button
                    onClick={() => removeCredential(credential.id)}
                    disabled={busy}
                    variant="danger"
                    size="sm"
                  >
                    {t('components.webauthn.removeButton')}
                  </Button>
                </li>
              ))}
            </ul>
            <Button onClick={registerCredential} disabled={busy} variant="secondary" size="md">
              {t('components.webauthn.registerAnotherCredentialButton')}
            </Button>
          </div>
        )}

        {(error || status) && (
          <FlashMessage variant={error ? 'danger' : 'success'} className="mt-6">
            {error || status}
          </FlashMessage>
        )}
      </section>
    </>
  )
}
