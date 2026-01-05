import React from 'react'
import { FieldError } from '../FieldError'

type FieldProps = React.HTMLProps<HTMLDivElement> & {
  label: string
  error?: string
}

export default function Field(props: FieldProps) {
  const { label, error, children, ...forwardProps } = props

  return (
    <div {...forwardProps}>
      <label>
        <p className="font-medium text-lg capitalize">{label}</p>
        {children}
      </label>

      <FieldError error={error} />
    </div>
  )
}
