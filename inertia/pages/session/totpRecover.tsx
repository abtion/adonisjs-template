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

export default function TotpRecover() {
  const { t } = useTranslation()

  const { data, setData, post, errors, processing } = useForm({
    recoveryCode: '',
  })

  const recover = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    post(tuyau.session.totp.recover.$url())
  }

  return (
    <SessionLayout>
      <Head title={t('pages.session.totpRecover.title')} />
      <div className="mx-auto w-full max-w-sm">
        <h2 className="mb-12 text-3xl font-semibold">{t('pages.session.totpRecover.heading')}</h2>
        <form key="recovery" onSubmit={recover}>
          <div className="mb-6">
            <label>
              <p className="text-lg font-medium">{t('fields.recoveryCode')}</p>
              <Input
                className="mt-2 w-full"
                size="md"
                type="text"
                name="recoveryCode"
                value={data.recoveryCode}
                onChange={(e) => setData('recoveryCode', e.target.value)}
                ref={useAutofillRef(({ value }) => setData('recoveryCode', value))}
                placeholder="XXXXX XXXXX"
                variant={errors.recoveryCode ? 'error' : 'default'}
              />
            </label>
            <p className="text-gray-600 mt-2 text-sm">
              {t('pages.session.toerrortpRecover.recoveryCodeDescription')}
            </p>
          </div>

          <FieldError error={errors.recoveryCode} className="mb-6" />
          <BaseFormError className="mb-6" />

          <div className="actions mb-4">
            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full"
              disabled={processing}
            >
              {t('pages.session.totpRecover.verifyButton')}
            </Button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => router.visit('/session/totp')}
              className="text-gray-600 hover:text-gray-800 text-sm underline"
            >
              {t('pages.session.totpRecover.backToVerificationCode')}
            </button>
          </div>
        </form>
      </div>
    </SessionLayout>
  )
}
