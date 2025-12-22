import Alert, { AlertProps } from '../Alert'

type Props = AlertProps & {
  error?: string
}

export function FieldError({ error, ...alertProps }: Props) {
  if (!error) return null

  return (
    <Alert variant="danger" {...alertProps}>
      {error}
    </Alert>
  )
}
