import React from "react"
import classNames from "classnames"
import "./index.scss"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: "xs" | "sm" | "md" | "lg" | "xl"
  variant?:
    | "basic"
    | "secondary"
    | "primary"
    | "neutral"
    | "success"
    | "danger"
    | "warning"
    | "info"
}

export default function Button(props: ButtonProps): JSX.Element {
  const { size, variant, className, ...rest } = props

  const usedClassName = classNames(
    "Button",
    {
      [`Button--${size}`]: size,
      [`Button--${variant}`]: variant,
    },
    className
  )

  return <button className={usedClassName} {...rest} />
}
