import { useState } from 'react'
import { startRegistration } from '@simplewebauthn/browser'
import Button from '~/components/Button'
import SecurityConfirmation from '~/components/SecurityConfirmation'
import { postJson } from '~/lib/api'
import { router } from '@inertiajs/react'

type Passkey = {
  id: number
  friendlyName: string | null
  createdAt: string | Date
  lastUsed: string | Date
}

type PasskeysProps = {
  initialPasskeys: Passkey[]
  hasPasskeys: boolean
}

export default function Passkeys({ initialPasskeys, hasPasskeys }: PasskeysProps) {
  const [passkeys, setPasskeys] = useState<Passkey[]>(initialPasskeys)
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
      const errorMessage = (err as Error).message
      // Check if error is about security confirmation
      if (err instanceof ApiError && err.status === 401) {
        setError(null)
        setPendingAction(() => fn)
        setShowConfirmation(true)
        setBusy(false)
        return
      }
      setError(errorMessage)
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

  const registerPasskey = () =>
    handle(async () => {
      const { options } = await postJson<{ options: any }>('/2fa/webauthn/register/options')
      const attestation = await startRegistration(options)
      await postJson('/2fa/webauthn/register/verify', { attestation })
      setStatus('Passkey registered successfully.')
      // Reload to get updated passkeys list
      router.reload({ only: ['passkeys'] })
    })

  const removePasskey = (id: number) =>
    handle(async () => {
      await postJson(`/profile/passkeys/${id}`, {}, 'DELETE')
      setPasskeys(passkeys.filter((pk) => pk.id !== id))
      setStatus('Passkey removed successfully.')
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
        hasPasskeys={hasPasskeys}
      />
      <section className="rounded-md border border-neutral-300 p-4">
        <h2 className="mb-2 text-xl font-semibold">Passkeys</h2>
        <p className="text-gray-600 mb-4 text-sm">
          Use passkeys for passwordless sign-in. Works with Touch ID, Face ID, Windows Hello, or
          security keys.
        </p>

        {passkeys.length === 0 ? (
          <div>
            <p className="text-gray-700 mb-4 text-sm">No passkeys registered.</p>
            <Button onClick={registerPasskey} disabled={busy} variant="primary" size="md">
              Register Passkey
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <ul className="space-y-2">
              {passkeys.map((passkey) => (
                <li
                  key={passkey.id}
                  className="flex items-center justify-between rounded border border-neutral-300 p-3"
                >
                  <div>
                    <p className="font-medium">{passkey.friendlyName || `Passkey ${passkey.id}`}</p>
                    <p className="text-gray-500 text-sm">
                      Registered: {new Date(passkey.createdAt).toLocaleDateString()}
                      {passkey.lastUsed &&
                        ` | Last Used: ${new Date(passkey.lastUsed).toLocaleDateString()}`}
                    </p>
                  </div>
                  <Button
                    onClick={() => removePasskey(passkey.id)}
                    disabled={busy}
                    variant="danger"
                    size="sm"
                  >
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
            <Button onClick={registerPasskey} disabled={busy} variant="secondary" size="md">
              Register Another Passkey
            </Button>
          </div>
        )}

        {(status || error) && (
          <div
            className={`mt-4 rounded p-3 ${error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}
          >
            {error || status}
          </div>
        )}
      </section>
    </>
  )
}
