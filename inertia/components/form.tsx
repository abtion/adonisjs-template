import { usePage } from '@inertiajs/react'
import React from 'react'

type PropTypes = React.FormHTMLAttributes<HTMLFormElement>

// Form that provides XCRF token automatically
export default function Form({ children, ...props }: PropTypes) {
  const { xcrfToken } = usePage().props

  return (
    <form {...props}>
      <input type="hidden" name="_csrf" value={xcrfToken as string} />
      {children}
    </form>
  )
}
