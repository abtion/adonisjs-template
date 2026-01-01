import { useLayoutEffect, useRef } from 'react'

export function useAutofillRef<E extends HTMLInputElement>(callback: (element: E) => void) {
  const inputRef = useRef<E>(null)

  useLayoutEffect(() => {
    callback(inputRef.current!)
  }, [])

  return inputRef
}
