import { Head } from '@inertiajs/react'
import { useState, FormEvent } from 'react'
import SessionLayout from '~/layouts/session'
import Button from '~/components/Button'
import Input from '~/components/Input'
import Alert from '~/components/Alert'
import TwoFactorController from '#controllers/two_factor_controller'
import { InferPageProps } from '@adonisjs/inertia/types'
import { postJson } from '~/lib/api'
import { router } from '@inertiajs/react'


export default function TwoFactorChallenge({
  methods,
}: InferPageProps<TwoFactorController, 'challenge'>) {
  const [otp, setOtp] = useState('')
  const [recoveryCode, setRecoveryCode] = useState('')
  const [showRecovery, setShowRecovery] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const handle = async (fn: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    try {
      await fn()
      router.visit('/')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const verifyTotp = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    handle(async () => {
      await postJson('/2fa/totp/verify', { otp })
    })
  }

  const verifyRecovery = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    handle(async () => {
      await postJson('/2fa/totp/verify', { otp: recoveryCode })
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
              <form onSubmit={verifyTotp}>
                <div className="mb-6">
                  <label>
                    <p className="text-lg font-medium">Verification Code</p>
                    <Input
                      className="mt-2 w-full"
                      size="md"
                      type="text"
                      name="otp"
                      autoComplete="one-time-code"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="000000"
                      variant={error ? 'error' : 'default'}
                    />
                  </label>
                  <p className="text-gray-600 mt-2 text-sm">
                    Enter the code from your authenticator app.
                  </p>
                </div>

                {error && (
                  <Alert variant="danger" className="mb-6">
                    {error}
                  </Alert>
                )}

                <div className="actions mb-4">
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    className="w-full"
                    disabled={busy || !otp}
                  >
                    Verify
                  </Button>
                </div>
              </form>
            )}

            {methods.recovery && (
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setShowRecovery(true)}
                  className="text-gray-600 hover:text-gray-800 text-sm underline"
                >
                  Can't access my account
                </button>
              </div>
            )}
          </>
        ) : (
          <form onSubmit={verifyRecovery}>
            <div className="mb-6">
              <label>
                <p className="text-lg font-medium">Recovery Code</p>
                <Input
                  className="mt-2 w-full"
                  size="md"
                  type="text"
                  name="recoveryCode"
                  value={recoveryCode}
                  onChange={(e) => setRecoveryCode(e.target.value)}
                  placeholder="XXXX XXXX"
                  variant={error ? 'error' : 'default'}
                />
              </label>
              <p className="text-gray-600 mt-2 text-sm">Enter one of your recovery codes.</p>
            </div>

            {error && (
              <Alert variant="danger" className="mb-6">
                {error}
              </Alert>
            )}

            <div className="actions mb-4">
              <Button
                type="submit"
                variant="primary"
                size="md"
                className="w-full"
                disabled={busy || !recoveryCode}
              >
                Verify Recovery Code
              </Button>
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setShowRecovery(false)
                  setRecoveryCode('')
                  setError(null)
                }}
                className="text-gray-600 hover:text-gray-800 text-sm underline"
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
