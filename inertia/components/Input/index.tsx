import React, { forwardRef } from 'react'
import classNames from 'classnames'
import './index.scss'

const InputVariants = ['default', 'error'] as const
export type InputVariant = (typeof InputVariants)[number]

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  variant?: InputVariant
}

const Input = forwardRef<HTMLInputElement, InputProps>((props, ref) => {
  const { size, variant, className, ...rest } = props

  const usedClassName = classNames(
    'Input',
    {
      [`Input--${size}`]: size,
      [`Input--${variant}`]: variant,
    },
    className
  )

  return <input ref={ref} className={usedClassName} {...rest} />
})

Input.displayName = 'Input'

export default Input
