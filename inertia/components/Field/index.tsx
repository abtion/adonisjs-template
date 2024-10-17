import React from 'react'
import Alert from '../Alert'

type FieldProps = React.HTMLProps<HTMLDivElement> & {
  label: string
  error?: string
}

export default function Field(props: FieldProps) {
  const { label, error, children, ...forwardProps } = props

  return (
    <div {...forwardProps}>
      <label>
        <p className="font-medium text-lg">{label}</p>
        {children}
      </label>

      {error && (
        <Alert variant="danger" className="mt-2">
          {error}
        </Alert>
      )}
    </div>
  )
}
