import { useState, useEffect } from 'react'
import { startAuthentication } from '@simplewebauthn/browser'
import Button from '~/components/Button'
import Input from '~/components/Input'
import ErrorMessage from '~/components/ErrorMessage'
import { postJson, ApiError } from '~/lib/api'

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
  const [errorType, setErrorType] = useState<'danger' | 'warning'>('danger')
  const [busy, setBusy] = useState(false)
  const [usingPasskey, setUsingPasskey] = useState(false)
  const [attemptCount, setAttemptCount] = useState(0)

  useEffect(() => {
    if (!isOpen) {
      setPassword('')
      setError(null)
      setUsingPasskey(false)
      setAttemptCount(0)
    }
  }, [isOpen])

  // Clear error when user starts typing
  useEffect(() => {
    if (error && password) {
      const timer = setTimeout(() => {
        setError(null)
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [password])

  const getErrorMessage = (err: unknown): string => {
    if (err instanceof ApiError) {
      if (err.errorType === 'network') {
        return 'Network connection error. Please check your internet connection and try again.'
      }
      // Check for security confirmation specific errors
      const message = err.message.toLowerCase()
      if (message.includes('security confirmation')) {
        if (message.includes('expired') || message.includes('timeout')) {
          return 'Security confirmation has expired. Please verify your identity again.'
        }
        if (message.includes('failed') || message.includes('invalid')) {
          return 'Security confirmation failed. Please verify your identity and try again.'
        }
        return 'Security confirmation required. Please verify your identity.'
      }
      return err.message
    }
    if (err instanceof Error) {
      return err.message
    }
    return 'An unexpected error occurred. Please try again.'
  }

  const handlePasswordConfirm = async () => {
    if (!password || password.trim().length === 0) {
      setError('Please enter your password.')
      setErrorType('danger')
      return
    }

    setBusy(true)
    setError(null)
    setErrorType('danger')
    
    try {
      await postJson('/profile/confirm-security', { password })
      onConfirmed()
      onClose()
    } catch (err) {
      const errorMessage = getErrorMessage(err)
      setError(errorMessage)
      
      if (err instanceof ApiError) {
        if (err.errorType === 'network') {
          setErrorType('warning')
        } else if (err.status === 401 || err.status === 403) {
          setErrorType('danger')
          setAttemptCount((prev) => prev + 1)
        }
      }
    } finally {
      setBusy(false)
    }
  }

  const handlePasskeyConfirm = async () => {
    setBusy(true)
    setError(null)
    setErrorType('danger')
    
    try {
      const { options } = await postJson<{ options: any }>('/profile/confirm-security/options')
      const assertion = await startAuthentication(options)
      await postJson('/profile/confirm-security', { assertion })
      onConfirmed()
      onClose()
    } catch (err) {
      const errorMessage = getErrorMessage(err)
      setError(errorMessage)
      
      if (err instanceof ApiError) {
        if (err.errorType === 'network') {
          setErrorType('warning')
        } else {
          setErrorType('danger')
          setAttemptCount((prev) => prev + 1)
        }
      } else if (err instanceof Error) {
        // WebAuthn specific errors
        if (err.name === 'NotAllowedError') {
          setError('Passkey verification was cancelled or not allowed. Please try again.')
        } else if (err.name === 'InvalidStateError') {
          setError('Passkey verification failed. Please try again.')
        } else {
          setError('Unable to verify passkey. Please try again or use password instead.')
        }
      }
    } finally {
      setBusy(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 !mt-0 flex items-center justify-center bg-black bg-opacity-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="security-confirmation-title"
      aria-describedby="security-confirmation-description"
    >
      <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 id="security-confirmation-title" className="mb-4 text-xl font-semibold">
          Confirm Your Identity
        </h2>
        <p id="security-confirmation-description" className="text-gray-600 mb-6 text-sm">
          For your security, please confirm your identity before making changes to your security
          settings.
        </p>

        {/* Prominent error display at the top */}
        {error && (
          <ErrorMessage
            message={error}
            variant={errorType}
            className="mb-4"
            aria-live="assertive"
            showIcon
          />
        )}

        {attemptCount > 0 && attemptCount < 3 && !error && (
          <div className="mb-4 rounded-md bg-yellow-50 p-3 text-sm text-yellow-800">
            {attemptCount === 1 && 'Verification failed. Please check your credentials and try again.'}
            {attemptCount === 2 && 'Verification failed again. Please double-check your password or try using a passkey.'}
          </div>
        )}

        {!usingPasskey ? (
          <div className="space-y-4">
            <div>
              <label htmlFor="security-password" className="mb-2 block text-sm font-medium">
                Password
              </label>
              <Input
                id="security-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                size="md"
                className="w-full"
                variant={error ? 'error' : 'default'}
                aria-invalid={error ? 'true' : 'false'}
                aria-describedby={error ? 'security-error' : undefined}
                disabled={busy}
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
                aria-busy={busy}
              >
                {busy ? 'Verifying...' : 'Confirm'}
              </Button>
              <Button onClick={onClose} variant="neutral" size="md" disabled={busy}>
                Cancel
              </Button>
            </div>
            {hasPasskeys && (
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setUsingPasskey(true)
                    setError(null)
                  }}
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
                aria-busy={busy}
              >
                {busy ? 'Verifying...' : 'Use Passkey'}
              </Button>
              <Button
                onClick={() => {
                  setUsingPasskey(false)
                  setError(null)
                }}
                variant="neutral"
                size="md"
                disabled={busy}
              >
                Back
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
