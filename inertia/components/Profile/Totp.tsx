import { useState } from 'react'
import { router } from '@inertiajs/react'
import { useTranslation } from 'react-i18next'
import Button from '~/components/Button'
import Input from '~/components/Input'
import SecurityConfirmation from '~/components/SecurityConfirmation'
import { errorIsType, tuyau } from '~/lib/tuyau'

type totpSecret = { secret: string; uri: string; qr: string }

type TotpProps = {
  initialEnabled: boolean
  recoveryCodesCount: number
  hasWebauthn: boolean
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

export default function Totp({ initialEnabled, recoveryCodesCount, hasWebauthn }: TotpProps) {
  const { t } = useTranslation()
  const [enabled, setEnabled] = useState(initialEnabled)
  const [setupMode, setSetupMode] = useState(false)
  const [secret, setSecret] = useState<totpSecret | null>(null)
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

  const setupTotp = () =>
    handle(async () => {
      const data = await tuyau.profile.totp.$post().unwrap()

      setSecret(data.secret)
      setRecoveryCodes(data.recoveryCodes)
      setSetupMode(true)
      setStatus(t('components.totp.scanQr'))
    })

  const verifyTotp = () =>
    handle(async () => {
      await tuyau.profile.totp.verify.$post({ otp }).unwrap()
      setEnabled(true)
      setSetupMode(false)
      setStatus(t('components.totp.enabled'))
      router.reload({ only: ['totp'] })
    })

  const generateRecovery = () =>
    handle(async () => {
      const data = await tuyau.profile.totp.regeneration.$post().unwrap()
      setRecoveryCodes(data.recoveryCodes)
      setShowRecoveryCodes(true)
      setStatus(t('components.totp.newRecoverySaved'))
      router.reload({ only: ['totp'] })
    })

  const disableTotp = () =>
    handle(async () => {
      await tuyau.profile.totp.$delete().unwrap()
      setEnabled(false)
      setSetupMode(false)
      setSecret(null)
      setRecoveryCodes(null)
      setStatus(t('components.totp.disabled'))
      router.reload({ only: ['totp'] })
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
        hasWebauthn={hasWebauthn}
      />
      <section className="mb-10 rounded-md border border-neutral-300 p-4">
        <h2 className="mb-2 text-xl font-semibold">{t('components.totp.title')}</h2>
        <p className="text-gray-600 mb-4 text-sm">{t('components.totp.description')}</p>

        {!enabled && !setupMode && (
          <div>
            <p className="text-gray-700 mb-4 text-sm">{t('components.totp.notSetUp')}</p>
            <Button onClick={setupTotp} disabled={busy} variant="primary" size="md">
              {t('components.totp.setupButton')}
            </Button>
          </div>
        )}

        {setupMode && secret && recoveryCodes && (
          <div className="bg-gray-50 mt-6 space-y-6 rounded-md p-4">
            <div>
              <h3 className="text-md mb-2 font-semibold">{t('components.totp.step1Title')}</h3>
              <p className="text-gray-600 mb-3 text-sm">{t('components.totp.saveRecoveryCodes')}</p>
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
                {t('components.totp.downloadRecoveryCodes')}
              </Button>
            </div>

            <div>
              <h3 className="text-md mb-2 font-semibold">{t('components.totp.step2Title')}</h3>
              <p className="text-gray-600 mb-3 text-sm">{t('components.totp.scanInstructions')}</p>

              <div className="flex flex-col items-start gap-4 md:flex-row">
                <div>
                  <img
                    src={secret.qr}
                    alt={t('components.totp.qrAlt')}
                    className="max-w-xs rounded border bg-white p-2"
                  />
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <p className="mb-1 text-sm font-semibold">{t('components.totp.orKeyManual')}</p>
                    <p className="font-mono break-all rounded border bg-white p-2 text-sm">
                      {secret.secret}
                    </p>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold">
                      {t('components.totp.enterVerificationCode')}
                    </label>
                    <Input
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder={t('components.totp.otpPlaceholder')}
                      autoComplete="one-time-code"
                      size="md"
                      className="max-w-xs"
                    />
                  </div>
                  <Button onClick={verifyTotp} disabled={busy || !otp} variant="success" size="md">
                    {t('components.totp.verifyButton')}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {enabled && !setupMode && (
          <div className="mt-6 space-y-4">
            <div>
              <p className="text-green-700 mb-3 text-sm font-medium">
                {t('components.totp.configured')}
              </p>
              <Button onClick={disableTotp} disabled={busy} variant="danger" size="md">
                {t('components.totp.disableButton')}
              </Button>
            </div>

            <div>
              <h3 className="text-md mb-2 font-semibold">{t('components.totp.recoveryTitle')}</h3>
              <p className="text-gray-600 mb-3 text-sm">
                {showRecoveryCodes && recoveryCodes
                  ? t('components.totp.saveAndDownload')
                  : recoveryCodesCount > 0
                    ? t('components.totp.youHaveRemaining', { count: recoveryCodesCount })
                    : t('components.totp.generateIfNeeded')}
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
                    {t('components.totp.downloadRecoveryCodes')}
                  </Button>
                </div>
              )}

              <Button onClick={generateRecovery} disabled={busy} variant="neutral" size="md">
                {t('components.totp.generateButton')}
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
