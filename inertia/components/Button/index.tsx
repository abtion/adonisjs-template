import React from 'react'
import classNames from 'classnames'
import './index.scss'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | 'basic'
    | 'secondary'
    | 'primary'
    | 'neutral'
    | 'success'
    | 'danger'
    | 'warning'
    | 'info'
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
}

function classes(props: ButtonProps, className?: string) {
  const { size, variant } = props

  return classNames(
    'Button',
    {
      [`Button--${size}`]: size,
      [`Button--${variant}`]: variant,
      ['Button--disabled']: props.disabled,
    },
    className
  )
}

export default function Button(props: ButtonProps): JSX.Element {
  const { size, variant, className, ...rest } = props

  return <button className={classes(props, className)} {...rest} />
}

Button.cn = classes
