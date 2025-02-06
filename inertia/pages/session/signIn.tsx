import { SharedProps } from '@adonisjs/inertia/types'
import { Head, useForm, usePage } from '@inertiajs/react'
import { ChangeEvent, FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import Alert from '~/components/Alert'
import Button from '~/components/Button'
import Input from '~/components/Input'
import SessionLayout from '~/layouts/session'

export default function SignIn() {
  const { t } = useTranslation()

  const {
    props: { exceptions },
  } = usePage<SharedProps>()

  const { data, setData, post, processing, errors } = useForm({
    email: '',
    password: '',
  })

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    post('/sign-in')
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    setData(event.currentTarget.name as keyof typeof data, event.currentTarget.value)
  }

  return (
    <SessionLayout>
      <Head title={t('pages.session.signIn.title')} />
      <form
        className="mx-auto max-w-sm w-full"
        action="/sign-in"
        method="post"
        onSubmit={handleSubmit}
      >
        <h2 className="text-3xl font-semibold mb-12">{t('pages.session.signIn.heading')}</h2>

        <div className="mb-6">
          <label>
            <p className="font-medium text-lg">{t('fields.email')}</p>
            <Input
              className="w-full mt-2"
              size="md"
              type="text"
              name="email"
              variant={errors.email ? 'error' : 'default'}
              value={data.email}
              onChange={handleChange}
              placeholder={t('pages.session.signIn.emailPlaceholder')}
            />
          </label>

          {errors.email && (
            <Alert variant="danger" className="mt-2">
              {errors.email}
            </Alert>
          )}
        </div>

        <div className="mb-6">
          <label>
            <p className="font-medium text-lg">{t('fields.password')}</p>
            <Input
              className="w-full mt-2"
              size="md"
              type="password"
              name="password"
              autoComplete="current-password"
              variant={errors.password ? 'error' : 'default'}
              value={data.password}
              onChange={handleChange}
              placeholder={t('pages.session.signIn.passwordPlaceholder')}
            />
          </label>

          {errors.password && (
            <Alert variant="danger" className="mt-2">
              {errors.password}
            </Alert>
          )}
        </div>

        {exceptions['E_INVALID_CREDENTIALS'] && (
          <Alert variant="danger" className="mt-2">
            {t(`pages.session.signIn.${exceptions['E_INVALID_CREDENTIALS']}`)}
          </Alert>
        )}

        <div className="actions mt-6">
          <Button
            type="submit"
            variant="primary"
            size="md"
            className="w-full"
            disabled={processing}
          >
            {t('pages.session.signIn.signIn')}
          </Button>
        </div>
      </form>
    </SessionLayout>
  )
}
