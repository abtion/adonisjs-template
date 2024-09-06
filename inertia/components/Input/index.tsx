import React from "react"
import classNames from "classnames"
import "./index.scss"

const InputVariants = ["default", "error"] as const
export type InputVariant = (typeof InputVariants)[number]

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  size?: "xs" | "sm" | "md" | "lg" | "xl"
  variant?: InputVariant
}

export default function Input(props: InputProps): JSX.Element {
  const { size, variant, className, ...rest } = props

  const usedClassName = classNames(
    "Input",
    {
      [`Input--${size}`]: size,
      [`Input--${variant}`]: variant,
    },
    className
  )

  return <input className={usedClassName} {...rest} />
}
