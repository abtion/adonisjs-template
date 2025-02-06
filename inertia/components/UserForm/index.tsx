import React, { ChangeEvent } from 'react'
import Field from '../Field'
import Input from '../Input'
import Button from '../Button'
import { useTranslation } from 'react-i18next'

type FieldName = 'name' | 'email' | 'password'

type UserFormProps = Omit<React.HTMLProps<HTMLFormElement>, 'data' | 'onChange'> & {
  data: Record<FieldName, string>
  errors: Partial<Record<FieldName, string>>
  processing: boolean
  onChange: (e: ChangeEvent<{ name: string; value: string }>) => void
  isEdit?: boolean
}

export default function UserForm(props: UserFormProps) {
  const { t } = useTranslation()
  const { errors, data, onChange, processing, isEdit, ...forwardProps } = props

  return (
    <form {...forwardProps}>
      <div className="w-80 flex flex-col gap-4">
        <Field label={t('fields.name')} error={errors.name}>
          <Input
            className="w-full mt-2"
            autoComplete="off"
            size="md"
            type="text"
            name="name"
            variant={errors.name ? 'error' : 'default'}
            value={data.name}
            onChange={onChange}
            placeholder={t('components.userForm.namePlaceholder')}
          />
        </Field>

        <Field label={t('fields.email')} error={errors.email}>
          <Input
            className="w-full mt-2"
            autoComplete="off"
            size="md"
            type="text"
            name="email"
            variant={errors.email ? 'error' : 'default'}
            value={data.email}
            onChange={onChange}
            placeholder={t('components.userForm.emailPlaceholder')}
          />
        </Field>

        <Field label={t('fields.password')} error={errors.password}>
          <Input
            className="w-full mt-2"
            autoComplete="new-password"
            size="md"
            type="password"
            name="password"
            variant={errors.password ? 'error' : 'default'}
            value={data.password}
            onChange={onChange}
            placeholder={t('components.userForm.passwordPlaceholder')}
          />
        </Field>
      </div>

      <div className="mt-5">
        <Button size="md" variant="primary" disabled={processing} type="submit">
          {isEdit ? t('common.save') : t('common.create')}
        </Button>
      </div>
    </form>
  )
}
