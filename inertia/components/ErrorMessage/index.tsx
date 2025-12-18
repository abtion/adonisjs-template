import React from 'react'
import Alert from '~/components/Alert'
import ExclamationTriangleIcon from '@heroicons/react/20/solid/ExclamationTriangleIcon'

export interface ErrorMessageProps {
  'message': string
  'variant'?: 'danger' | 'warning' | 'info'
  'className'?: string
  'onDismiss'?: () => void
  'showIcon'?: boolean
  'aria-live'?: 'polite' | 'assertive' | 'off'
}

/**
 * Reusable error message component with consistent styling and accessibility
 * Displays errors with proper ARIA labels and clear visual indicators
 */
export default function ErrorMessage({
  message,
  variant = 'danger',
  className = '',
  onDismiss,
  showIcon = true,
  'aria-live': ariaLive = 'assertive',
}: ErrorMessageProps): JSX.Element {
  return (
    <div className={className} role="alert" aria-live={ariaLive}>
      <Alert variant={variant} onClose={onDismiss} className="flex items-start gap-3">
        {showIcon && (
          <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 flex-shrink-0" aria-hidden="true" />
        )}
        <div className="flex-1">
          <p className="text-sm font-medium">{message}</p>
        </div>
      </Alert>
    </div>
  )
}
