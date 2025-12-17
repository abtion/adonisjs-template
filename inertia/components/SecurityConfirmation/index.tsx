import { useState, useEffect } from 'react'
import { startAuthentication } from '@simplewebauthn/browser'
import Button from '~/components/Button'
import Input from '~/components/Input'
import { postJson } from '~/lib/api'

type SecurityConfirmationProps = {
  isOpen: boolean
  onClose: () => void
  onConfirmed: () => void
  hasPasskeys: boolean
}

export default function SecurityConfirmation({
  isOpen,
  onClose,
  onConfirmed,
  hasPasskeys,
}: SecurityConfirmationProps) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [usingPasskey, setUsingPasskey] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      setPassword('')
      setError(null)
      setUsingPasskey(false)
    }
  }, [isOpen])

  const handlePasswordConfirm = async () => {
    setBusy(true)
    setError(null)
    try {
      await postJson('/profile/confirm-security', { password })
      onConfirmed()
      onClose()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const handlePasskeyConfirm = async () => {
    setBusy(true)
    setError(null)
    try {
      const { options } = await postJson<{ options: any }>('/profile/confirm-security/options')
      const assertion = await startAuthentication(options)
      await postJson('/profile/confirm-security', { assertion })
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
        <h2 className="mb-4 text-xl font-semibold">Confirm Your Identity</h2>
        <p className="text-gray-600 mb-6 text-sm">
          For your security, please confirm your identity before making changes to your security
          settings.
        </p>

        {!usingPasskey ? (
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium">Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
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
                Confirm
              </Button>
              <Button onClick={onClose} variant="neutral" size="md" disabled={busy}>
                Cancel
              </Button>
            </div>
            {hasPasskeys && (
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => setUsingPasskey(true)}
                  disabled={busy}
                  className="text-blue-600 hover:text-blue-800 disabled:text-gray-400 text-sm"
                >
                  Use Passkey instead
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-gray-600 text-sm">
              Use your passkey to confirm your identity. You may be prompted to use Touch ID, Face
              ID, Windows Hello, or your security key.
            </p>
            <div className="flex gap-3">
              <Button
                onClick={handlePasskeyConfirm}
                variant="primary"
                size="md"
                disabled={busy}
                className="flex-1"
              >
                {busy ? 'Verifying...' : 'Use Passkey'}
              </Button>
              <Button
                onClick={() => setUsingPasskey(false)}
                variant="neutral"
                size="md"
                disabled={busy}
              >
                Back
              </Button>
            </div>
          </div>
        )}

        {error && <div className="bg-red-50 text-red-700 mt-4 rounded p-3 text-sm">{error}</div>}
      </div>
    </div>
  )
}
