import { useState } from 'react'
import { router } from '@inertiajs/react'
import { useTranslation } from 'react-i18next'
import Button from '~/components/Button'
import Input from '~/components/Input'
import SecurityConfirmation from '~/components/SecurityConfirmation'
import { errorIsType, getErrorMessage, tuyau } from '~/lib/tuyau'
import Alert from '../Alert'
import FlashMessage from '../FlashMessage'

type TotpSecret = { secret: string; uri: string; qr: string }

type TotpState =
  | { state: 'disabled'; status?: string }
  | { state: 'setup-mode'; secret: TotpSecret; recoveryCodes: string[]; otp: string }
  | { state: 'enabled'; recoveryCodes?: string[]; status?: string }

type TotpProps = {
  enabled: boolean
  recoveryCodesCount: number
}
const downloadRecoveryCodes = (codes: string[]) => {
  const blob = new Blob([codes.join('\n')], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'recovery-codes.txt'
  a.click()
  URL.revokeObjectURL(url)
}

export default function Totp({ enabled, recoveryCodesCount }: TotpProps) {
  const { t } = useTranslation()
  const [totpState, setTotpState] = useState<TotpState>(() => {
    return enabled ? { state: 'enabled' } : { state: 'disabled' }
  })
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [pendingAction, setPendingAction] = useState<(() => Promise<void>) | null>(null)
  const [disableOtp, setDisableOtp] = useState<string | null>(null)
  const [disableError, setDisableError] = useState<string | null>(null)
  const [disableBusy, setDisableBusy] = useState(false)

  const handle = async (fn: () => Promise<void>) => {
    setBusy(true)
    setError(null)
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
      setError(getErrorMessage(err, t('errors.fallbackError')))
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
      setTotpState({
        state: 'setup-mode',
        secret: data.secret,
        recoveryCodes: data.recoveryCodes,
        otp: '',
      })
    })

  const verifyTotp = () =>
    handle(async () => {
      if (totpState.state !== 'setup-mode') return
      await tuyau.profile.totp.verify.$post({ otp: totpState.otp }).unwrap()
      setTotpState({ state: 'enabled', status: t('components.totp.enabled') })
      router.reload({ only: ['totp'] })
    })

  const generateRecovery = () =>
    handle(async () => {
      const data = await tuyau.profile.totp.regeneration.$post().unwrap()
      setTotpState({ state: 'enabled', recoveryCodes: data.recoveryCodes })
      router.reload({ only: ['totp'] })
    })

  const confirmDisableTotp = () => {
    setError(null)
    setPendingAction(() => async () => {
      setDisableOtp('')
      setDisableError(null)
    })
    setShowConfirmation(true)
  }

  const submitDisableTotp = async () => {
    if (disableOtp === null) return
    setDisableBusy(true)
    setDisableError(null)
    try {
      await tuyau.profile.totp.$delete({ otp: disableOtp }).unwrap()
      setDisableOtp(null)
      setTotpState({ state: 'disabled', status: t('components.totp.disabled') })
      router.reload({ only: ['totp'] })
    } catch (err) {
      if (errorIsType(err, 'SecurityConfirmationRequiredError')) {
        setDisableError(null)
        setPendingAction(() => submitDisableTotp)
        setShowConfirmation(true)
        setDisableBusy(false)
        return
      }
      setDisableError(getErrorMessage(err, t('errors.fallbackError')))
    } finally {
      setDisableBusy(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      verifyTotp()
    }
  }

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
      <section className="mb-10 rounded-md border border-neutral-300 p-4">
        <h2 className="mb-2 text-xl">{t('components.totp.title')}</h2>
        <p className="text-gray-600 mb-4 text-sm">{t('components.totp.description')}</p>

        {totpState.state === 'disabled' && (
          <div>
            <p className="text-gray-700 mb-4 text-sm">{t('components.totp.notSetUp')}</p>
            <Button onClick={setupTotp} disabled={busy} variant="primary" size="md">
              {t('components.totp.setupButton')}
            </Button>
          </div>
        )}

        {totpState.state === 'setup-mode' && (
          <div className="bg-gray-50 mt-6 space-y-6 rounded-md p-4">
            <div>
              <h3 className="text-md mb-2 font-semibold">{t('components.totp.step1Title')}</h3>
              <p className="text-gray-600 mb-3 text-sm">{t('components.totp.saveRecoveryCodes')}</p>
              <div className="mb-3 rounded border border-info-200 bg-info-50 p-4">
                <ul className="font-mono grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
                  {totpState.recoveryCodes.map((code) => (
                    <li key={code} className="px-2 py-1">
                      {code}
                    </li>
                  ))}
                </ul>
              </div>
              <Button
                onClick={() => downloadRecoveryCodes(totpState.recoveryCodes)}
                variant="primary"
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
                    src={totpState.secret.qr}
                    alt={t('components.totp.qrAlt')}
                    className="max-w-xs rounded border border-neutral-300 bg-neutral-50 p-2"
                  />
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <p className="mb-2 text-sm font-semibold">{t('components.totp.scanQr')}</p>
                    <label className="block">
                      <p className="mb-1 text-sm font-semibold">
                        {t('components.totp.orKeyManual')}
                      </p>
                      <Input
                        size="md"
                        name="secret"
                        variant="default"
                        readOnly
                        className="font-mono w-80 border-info-200 bg-info-50 text-xs"
                        value={totpState.secret.secret}
                      />
                    </label>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold">
                      {t('components.totp.enterVerificationCode')}
                    </label>
                    <Input
                      value={totpState.otp}
                      onChange={(e) => setTotpState({ ...totpState, otp: e.target.value })}
                      onKeyDown={handleKeyDown}
                      placeholder={t('components.totp.otpPlaceholder')}
                      autoComplete="one-time-code"
                      size="md"
                      variant="default"
                    />
                  </div>
                  <Button
                    onClick={verifyTotp}
                    disabled={busy || !totpState.otp}
                    variant="primary"
                    size="md"
                  >
                    {t('components.totp.verifyButton')}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {disableOtp !== null && (
          <div className="fixed inset-0 z-50 !mt-0 flex items-center justify-center bg-black bg-opacity-50">
            <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
              <h2 className="mb-4 text-xl font-semibold">
                {t('components.totp.confirmDisableTitle')}
              </h2>
              <p className="text-gray-600 mb-6 text-sm">
                {t('components.totp.confirmDisableDescription')}
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  submitDisableTotp()
                }}
                className="space-y-4"
              >
                <label className="block">
                  <p className="mb-2 text-sm font-medium">
                    {t('components.totp.confirmDisableLabel')}
                  </p>
                  <Input
                    value={disableOtp}
                    onChange={(e) => setDisableOtp(e.target.value)}
                    placeholder={t('components.totp.otpPlaceholder')}
                    autoComplete="one-time-code"
                    size="md"
                    variant="default"
                    className="w-full"
                    autoFocus
                  />
                </label>
                <p className="text-gray-500 text-xs">{t('components.totp.confirmDisableHelp')}</p>
                <div className="flex gap-3">
                  <Button
                    variant="danger"
                    size="md"
                    type="submit"
                    disabled={disableBusy || !disableOtp}
                    className="flex-1"
                  >
                    {t('components.totp.disableButton')}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      setDisableOtp(null)
                      setDisableError(null)
                    }}
                    disabled={disableBusy}
                    variant="neutral"
                    size="md"
                  >
                    {t('components.securityConfirmation.cancelButton')}
                  </Button>
                </div>
              </form>
              {disableError && (
                <Alert variant="danger" className="mt-6">
                  {disableError}
                </Alert>
              )}
            </div>
          </div>
        )}

        {totpState.state === 'enabled' && (
          <div className="mt-6 space-y-4">
            <div>
              <p className="text-green-700 mb-3 text-sm font-medium">
                {t('components.totp.configured')}
              </p>
              <Button onClick={confirmDisableTotp} disabled={busy} variant="danger" size="md">
                {t('components.totp.disableButton')}
              </Button>
            </div>

            <div>
              <h3 className="text-md mb-2 font-semibold">{t('components.totp.recoveryTitle')}</h3>
              <p className="text-gray-600 mb-3 text-sm">
                {totpState.recoveryCodes
                  ? t('components.totp.saveAndDownload')
                  : recoveryCodesCount > 0
                    ? t('components.totp.youHaveRemaining', { count: recoveryCodesCount })
                    : t('components.totp.generateIfNeeded')}
              </p>

              {totpState.recoveryCodes && (
                <div className="bg-gray-50 mb-4 rounded border border-neutral-300 p-4">
                  <div className="mb-3 rounded border border-info-200 bg-info-50 p-4">
                    <ul className="font-mono grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
                      {totpState.recoveryCodes.map((code) => (
                        <li key={code} className="px-2 py-1">
                          {code}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Button
                    onClick={() => downloadRecoveryCodes(totpState.recoveryCodes!)}
                    variant="primary"
                    size="md"
                  >
                    {t('components.totp.downloadRecoveryCodes')}
                  </Button>
                </div>
              )}

              <Button onClick={generateRecovery} disabled={busy} variant="primary" size="md">
                {t('components.totp.generateButton')}
              </Button>
            </div>
          </div>
        )}

        {error && (
          <FlashMessage variant="danger" className="mt-4">
            {error}
          </FlashMessage>
        )}
        {'status' in totpState && totpState.status && (
          <FlashMessage variant="success" className="mt-4">
            {totpState.status}
          </FlashMessage>
        )}
      </section>
    </>
  )
}
