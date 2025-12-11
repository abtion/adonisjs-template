import { useState } from 'react'
import Button from '~/components/Button'
import Input from '~/components/Input'
import SecurityConfirmation from '~/components/SecurityConfirmation'

type TwoFactorSecret = { secret: string; uri: string; qr: string }

type TwoFactorProps = {
  initialEnabled: boolean
  recoveryCodesCount: number
  hasPasskeys: boolean
}

const getCsrfToken = () => {
  const match = document.cookie.match(new RegExp('(^| )XSRF-TOKEN=([^;]+)'))
  return match ? decodeURIComponent(match[2]) : ''
}

async function postJson<T = any>(url: string, payload?: Record<string, unknown>) {
  const csrf = getCsrfToken()
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-XSRF-TOKEN': csrf,
    },
    body: payload ? JSON.stringify(payload) : undefined,
  })

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    throw new Error((data as any).message || 'Request failed')
  }

  return data as T
}

const downloadRecoveryCodes = (codes: string[]) => {
  const content = codes.join('\n')
  const blob = new Blob([content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'recovery-codes.txt'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export default function TwoFactor({
  initialEnabled,
  recoveryCodesCount,
  hasPasskeys,
}: TwoFactorProps) {
  const [enabled, setEnabled] = useState(initialEnabled)
  const [setupMode, setSetupMode] = useState(false)
  const [secret, setSecret] = useState<TwoFactorSecret | null>(null)
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null)
  const [showRecoveryCodes, setShowRecoveryCodes] = useState(false)
  const [otp, setOtp] = useState('')
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
      if (errorMessage.includes('Security confirmation required')) {
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

  const setupTotp = () =>
    handle(async () => {
      const data = await postJson<{ secret: TwoFactorSecret; recoveryCodes: string[] }>(
        '/profile/enable-mfa'
      )
      setSecret(data.secret)
      setRecoveryCodes(data.recoveryCodes)
      setSetupMode(true)
      setStatus('Scan the QR code and verify with a code from your authenticator app.')
    })

  const verifyTotp = () =>
    handle(async () => {
      await postJson('/2fa/totp/verify', { otp })
      setEnabled(true)
      setSetupMode(false)
      setStatus('Two-factor authentication enabled successfully.')
    })

  const generateRecovery = () =>
    handle(async () => {
      const data = await postJson<{ recoveryCodes: string[] }>('/2fa/recovery-codes')
      setRecoveryCodes(data.recoveryCodes)
      setShowRecoveryCodes(true)
      setStatus('New recovery codes generated. Store them safely.')
    })

  const disableTotp = () =>
    handle(async () => {
      await postJson('/2fa/disable')
      setEnabled(false)
      setSetupMode(false)
      setSecret(null)
      setRecoveryCodes(null)
      setStatus('Two-factor authentication disabled.')
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
      <section className="mb-10 rounded-md border border-neutral-300 p-4">
        <h2 className="mb-2 text-xl font-semibold">Two-Factor Authentication (OTP)</h2>
      <p className="text-gray-600 mb-4 text-sm">
        Use an authenticator app to generate one-time codes for an extra layer of security.
      </p>

      {!enabled && !setupMode && (
        <div>
          <p className="text-gray-700 mb-4 text-sm">Authenticator app not set up.</p>
          <Button onClick={setupTotp} disabled={busy} variant="primary" size="md">
            Set Up Authenticator App
          </Button>
        </div>
      )}

      {setupMode && secret && recoveryCodes && (
        <div className="bg-gray-50 mt-6 space-y-6 rounded-md p-4">
          <div>
            <h3 className="text-md mb-2 font-semibold">Step 1: Download Recovery Codes</h3>
            <p className="text-gray-600 mb-3 text-sm">
              Save these recovery codes in a safe place. You'll need them if you lose access to your
              authenticator app.
            </p>
            <div className="mb-3 rounded border bg-white p-4">
              <ul className="font-mono grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
                {recoveryCodes.map((code) => (
                  <li key={code} className="px-2 py-1">
                    {code}
                  </li>
                ))}
              </ul>
            </div>
            <Button
              onClick={() => downloadRecoveryCodes(recoveryCodes)}
              variant="neutral"
              size="md"
            >
              Download Recovery Codes
            </Button>
          </div>

          <div>
            <h3 className="text-md mb-2 font-semibold">Step 2: Scan QR Code</h3>
            <p className="text-gray-600 mb-3 text-sm">
              Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
            </p>
            <div className="flex flex-col items-start gap-4 md:flex-row">
              <div>
                <img
                  src={secret.qr}
                  alt="TOTP QR code"
                  className="max-w-xs rounded border bg-white p-2"
                />
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <p className="mb-1 text-sm font-semibold">Or enter this key manually:</p>
                  <p className="font-mono break-all rounded border bg-white p-2 text-sm">
                    {secret.secret}
                  </p>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold">
                    Enter verification code:
                  </label>
                  <Input
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="000000"
                    autoComplete="one-time-code"
                    size="md"
                    className="max-w-xs"
                  />
                </div>
                <Button onClick={verifyTotp} disabled={busy || !otp} variant="success" size="md">
                  Verify and Complete Setup
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {enabled && !setupMode && (
        <div className="mt-6 space-y-4">
          <div>
            <p className="text-green-700 mb-3 text-sm font-medium">Authenticator app configured</p>
            <Button onClick={disableTotp} disabled={busy} variant="danger" size="md">
              Disable OTP
            </Button>
          </div>

          <div>
            <h3 className="text-md mb-2 font-semibold">Recovery Codes</h3>
            <p className="text-gray-600 mb-3 text-sm">
              {showRecoveryCodes && recoveryCodes
                ? 'Save these recovery codes in a safe place. You can download them below.'
                : recoveryCodesCount > 0
                  ? `You have ${recoveryCodesCount} recovery codes remaining.`
                  : 'Generate new recovery codes if needed.'}
            </p>

            {showRecoveryCodes && recoveryCodes && (
              <div className="bg-gray-50 mb-4 rounded border p-4">
                <div className="mb-3 rounded border bg-white p-4">
                  <ul className="font-mono grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
                    {recoveryCodes.map((code) => (
                      <li key={code} className="px-2 py-1">
                        {code}
                      </li>
                    ))}
                  </ul>
                </div>
                <Button
                  onClick={() => {
                    downloadRecoveryCodes(recoveryCodes)
                    setShowRecoveryCodes(false)
                  }}
                  variant="neutral"
                  size="md"
                >
                  Download Recovery Codes
                </Button>
              </div>
            )}

            <Button onClick={generateRecovery} disabled={busy} variant="neutral" size="md">
              Generate New Recovery Codes
            </Button>
          </div>
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
