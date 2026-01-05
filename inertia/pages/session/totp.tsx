import { Head, router, useForm } from '@inertiajs/react'
import { FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { BaseFormError } from '~/components/BaseFormError'
import Button from '~/components/Button'
import { FieldError } from '~/components/FieldError'
import Input from '~/components/Input'
import { useAutofillRef } from '~/hooks/use_autofill_ref'
import SessionLayout from '~/layouts/session'
import { tuyau } from '~/lib/tuyau'

export default function Totp() {
  const { t } = useTranslation()

  const { data, setData, post, errors, processing } = useForm({
    otp: '',
  })

  const verifyTotp = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    post(tuyau.session.totp.$url())
  }

  return (
    <SessionLayout>
      <Head title={t('pages.session.totp.title')} />
      <div className="mx-auto w-full max-w-sm">
        <h2 className="mb-12 text-3xl font-semibold">{t('pages.session.totp.heading')}</h2>

        <form key="totp" onSubmit={verifyTotp}>
          <div className="mb-6">
            <label>
              <p className="text-lg font-medium">{t('fields.otp')}</p>
              <Input
                className="mt-2 w-full"
                size="md"
                type="text"
                name="otp"
                autoComplete="one-time-code"
                value={data.otp}
                onChange={(e) => setData('otp', e.target.value)}
                ref={useAutofillRef(({ value }) => setData('otp', value))}
                placeholder="000000"
                variant={errors.otp ? 'error' : 'default'}
              />
            </label>
            <p className="text-gray-600 mt-2 text-sm">
              {t('pages.session.totp.verificationCodeDescription')}
            </p>
          </div>

          <FieldError error={errors.otp} className="mb-6" />
          <BaseFormError className="mb-6" />

          <div className="actions mb-4">
            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full"
              disabled={processing}
            >
              {t('pages.session.totp.verifyButton')}
            </Button>
          </div>
        </form>

        <div className="text-center">
          <button
            type="button"
            onClick={() => router.visit('/session/totp/recover')}
            className="text-gray-600 hover:text-gray-800 text-sm underline"
          >
            {t('pages.session.totp.cannotAccessAccount')}
          </button>
        </div>
      </div>
    </SessionLayout>
  )
}
