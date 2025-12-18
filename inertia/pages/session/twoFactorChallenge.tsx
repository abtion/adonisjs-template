import { Head } from '@inertiajs/react'
import { useState, FormEvent, useEffect } from 'react'
import SessionLayout from '~/layouts/session'
import Button from '~/components/Button'
import Input from '~/components/Input'
import ErrorMessage from '~/components/ErrorMessage'
import TwoFactorController from '#controllers/two_factor_controller'
import { InferPageProps } from '@adonisjs/inertia/types'
import { postJson, ApiError } from '~/lib/api'
import { router } from '@inertiajs/react'

export default function TwoFactorChallenge({
  methods,
}: InferPageProps<TwoFactorController, 'challenge'>) {
  const [otp, setOtp] = useState('')
  const [recoveryCode, setRecoveryCode] = useState('')
  const [showRecovery, setShowRecovery] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errorType, setErrorType] = useState<'danger' | 'warning'>('danger')
  const [busy, setBusy] = useState(false)
  const [attemptCount, setAttemptCount] = useState(0)

  // Clear error when switching between TOTP and recovery code modes
  useEffect(() => {
    setError(null)
    setAttemptCount(0)
  }, [showRecovery])

  // Clear error when input changes (user is correcting their mistake)
  useEffect(() => {
    if (error && (otp || recoveryCode)) {
      // Only clear error after a short delay to avoid flickering
      const timer = setTimeout(() => {
        setError(null)
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [otp, recoveryCode])

  const getErrorMessage = (err: unknown): string => {
    if (err instanceof ApiError) {
      // Handle specific error types
      if (err.errorType === 'network') {
        return 'Network connection error. Please check your internet connection and try again.'
      }
      if (err.errorType === 'rateLimit') {
        return err.message // Already enhanced in API utility
      }
      // Use the error message from the server
      return err.message
    }
    if (err instanceof Error) {
      return err.message
    }
    return 'An unexpected error occurred. Please try again.'
  }

  const handle = async (fn: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    setErrorType('danger')
    
    try {
      await fn()
      // Success - redirect to home
      router.visit('/')
    } catch (err) {
      const errorMessage = getErrorMessage(err)
      setError(errorMessage)
      
      // Determine error type for styling
      if (err instanceof ApiError) {
        if (err.errorType === 'rateLimit') {
          setErrorType('warning')
        } else if (err.errorType === 'network') {
          setErrorType('warning')
        }
      }
      
      // Track attempt count for user feedback
      setAttemptCount((prev) => prev + 1)
    } finally {
      setBusy(false)
    }
  }

  const verifyTotp = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    // Basic client-side validation
    if (!otp || otp.trim().length === 0) {
      setError('Please enter a verification code.')
      setErrorType('danger')
      return
    }
    
    // Validate format (should be 6 digits)
    if (!/^\d{6}$/.test(otp.trim())) {
      setError('Please enter a valid 6-digit code from your authenticator app.')
      setErrorType('danger')
      return
    }
    
    handle(async () => {
      await postJson('/2fa/totp/verify', { otp: otp.trim() })
    })
  }

  const verifyRecovery = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    // Basic client-side validation
    if (!recoveryCode || recoveryCode.trim().length === 0) {
      setError('Please enter a recovery code.')
      setErrorType('danger')
      return
    }
    
    handle(async () => {
      await postJson('/2fa/totp/verify', { otp: recoveryCode.trim() })
    })
  }

  return (
    <SessionLayout>
      <Head title="Two-Factor Authentication" />
      <div className="mx-auto w-full max-w-sm">
        <h2 className="mb-12 text-3xl font-semibold">Two-Factor Authentication</h2>

        {!showRecovery ? (
          <>
            {methods.totp && (
              <form onSubmit={verifyTotp} noValidate>
                <div className="mb-6">
                  <label htmlFor="otp-input">
                    <p className="text-lg font-medium">Verification Code</p>
                    <Input
                      id="otp-input"
                      className="mt-2 w-full"
                      size="md"
                      type="text"
                      name="otp"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      value={otp}
                      onChange={(e) => {
                        // Only allow digits
                        const value = e.target.value.replace(/\D/g, '').slice(0, 6)
                        setOtp(value)
                      }}
                      placeholder="000000"
                      variant={error ? 'error' : 'default'}
                      aria-invalid={error ? 'true' : 'false'}
                      aria-describedby={error ? 'otp-error' : undefined}
                      disabled={busy}
                      autoFocus
                    />
                  </label>
                  <p className="text-gray-600 mt-2 text-sm">
                    Enter the code from your authenticator app.
                  </p>
                  {attemptCount > 0 && attemptCount < 3 && (
                    <p className="text-gray-500 mt-1 text-xs">
                      {attemptCount === 1 && '1 failed attempt.'}
                      {attemptCount === 2 && '2 failed attempts. Please double-check your code.'}
                    </p>
                  )}
                </div>

                {error && (
                  <ErrorMessage
                    message={error}
                    variant={errorType}
                    className="mb-6"
                    aria-live="assertive"
                    showIcon
                  />
                )}

                <div className="actions mb-4">
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    className="w-full"
                    disabled={busy || !otp || otp.length !== 6}
                    aria-busy={busy}
                  >
                    {busy ? 'Verifying...' : 'Verify'}
                  </Button>
                </div>
              </form>
            )}

            {methods.recovery && (
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setShowRecovery(true)
                    setError(null)
                    setOtp('')
                  }}
                  className="text-gray-600 hover:text-gray-800 text-sm underline"
                  disabled={busy}
                >
                  Can't access my account
                </button>
              </div>
            )}
          </>
        ) : (
          <form onSubmit={verifyRecovery} noValidate>
            <div className="mb-6">
              <label htmlFor="recovery-code-input">
                <p className="text-lg font-medium">Recovery Code</p>
                <Input
                  id="recovery-code-input"
                  className="mt-2 w-full"
                  size="md"
                  type="text"
                  name="recoveryCode"
                  value={recoveryCode}
                  onChange={(e) => setRecoveryCode(e.target.value.trim())}
                  placeholder="XXXX XXXX"
                  variant={error ? 'error' : 'default'}
                  aria-invalid={error ? 'true' : 'false'}
                  aria-describedby={error ? 'recovery-error' : undefined}
                  disabled={busy}
                  autoFocus
                />
              </label>
              <p className="text-gray-600 mt-2 text-sm">
                Enter one of your recovery codes. Each code can only be used once.
              </p>
              {attemptCount > 0 && (
                <p className="text-gray-500 mt-1 text-xs">
                  {attemptCount === 1 && 'Recovery code not recognized. Please check and try again.'}
                  {attemptCount >= 2 && 'This recovery code may have already been used. Try a different code.'}
                </p>
              )}
            </div>

            {error && (
              <ErrorMessage
                message={error}
                variant={errorType}
                className="mb-6"
                aria-live="assertive"
                showIcon
              />
            )}

            <div className="actions mb-4">
              <Button
                type="submit"
                variant="primary"
                size="md"
                className="w-full"
                disabled={busy || !recoveryCode}
                aria-busy={busy}
              >
                {busy ? 'Verifying...' : 'Verify Recovery Code'}
              </Button>
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setShowRecovery(false)
                  setRecoveryCode('')
                  setError(null)
                  setAttemptCount(0)
                }}
                className="text-gray-600 hover:text-gray-800 text-sm underline"
                disabled={busy}
              >
                Back to verification code
              </button>
            </div>
          </form>
        )}
      </div>
    </SessionLayout>
  )
}
