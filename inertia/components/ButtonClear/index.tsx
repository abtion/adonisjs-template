import React from 'react'
import classNames from 'classnames'
import './index.scss'

export interface ButtonClearProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  variant?:
    | 'basic'
    | 'secondary'
    | 'primary'
    | 'neutral'
    | 'success'
    | 'danger'
    | 'warning'
    | 'info'
}

function classes(props: ButtonClearProps, className?: string) {
  const { size, variant } = props

  return classNames(
    'ButtonClear',
    {
      [`ButtonClear--${size}`]: size,
      [`ButtonClear--${variant}`]: variant,
      ['ButtonClear--disabled']: props.disabled,
    },
    className
  )
}

export default function ButtonClear(props: ButtonClearProps): JSX.Element {
  const { size, variant, className, ...rest } = props

  return <button className={classes(props, className)} {...rest} />
}

ButtonClear.cn = classes
