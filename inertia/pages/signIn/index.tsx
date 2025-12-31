import { Head, useForm } from '@inertiajs/react'
import { FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { BaseFormError } from '~/components/BaseFormError'
import Button from '~/components/Button'
import { FieldError } from '~/components/FieldError'
import Input from '~/components/Input'
import { useAutofillRef } from '~/hooks/use_autofill_ref'
import SessionLayout from '~/layouts/session'
import { tuyau } from '~/lib/tuyau'

export default function SignInIndex() {
  const { t } = useTranslation()

  const { data, setData, post, processing, errors } = useForm({
    email: '',
  })

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    post(tuyau['sign-in'].$url())
  }

  return (
    <SessionLayout>
      <Head title={t('pages.session.signIn.title')} />
      <div className="mx-auto w-full max-w-sm">
        <h2 className="mb-12 text-3xl font-semibold">{t('pages.session.signIn.heading')}</h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label>
              <p className="text-lg font-medium">{t('fields.email')}</p>
              <Input
                autoFocus
                className="mt-2 w-full"
                size="md"
                type="text"
                name="email"
                variant={errors.email ? 'error' : 'default'}
                value={data.email}
                onChange={(e) => setData('email', e.target.value)}
                placeholder={t('pages.session.signIn.emailPlaceholder')}
                autoComplete="email webauthn"
                ref={useAutofillRef<HTMLInputElement>(({ value }) => setData('email', value))}
              />
            </label>

            <FieldError error={errors.email} className="mt-2" />
          </div>

          <BaseFormError className="mb-6" />

          <div className="actions mt-6">
            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full"
              disabled={processing}
            >
              {processing
                ? t('pages.session.signIn.checkingEmail')
                : t('pages.session.signIn.continue')}
            </Button>
          </div>
        </form>
      </div>
    </SessionLayout>
  )
}
