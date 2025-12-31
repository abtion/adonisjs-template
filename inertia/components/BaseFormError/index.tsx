import { SharedData } from '@adonisjs/inertia/types'
import { usePage } from '@inertiajs/react'
import Alert, { AlertProps } from '../Alert'

/**
 * Meant to show FormErrors thrown from controllers
 */
export function BaseFormError({ ...alertProps }: AlertProps) {
  const errors = usePage<SharedData>().props.errors
  if (!errors?.base && !errors?.['']) return null

  return (
    <Alert variant="danger" {...alertProps}>
      {errors.base || errors['']}
    </Alert>
  )
}
