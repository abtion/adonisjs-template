import { SharedProps } from '@adonisjs/inertia/types'
import { usePage } from '@inertiajs/react'
import { HTMLProps } from 'react'
import FlashMessage from '../FlashMessage'

export function FlashMessages(props: HTMLProps<HTMLDivElement>) {
  const {
    props: { messages },
  } = usePage<SharedProps>()

  if (messages.alert || messages.warning || messages.notice) {
    return (
      <div className={`space-y-4 ${props.className || ''}`}>
        {messages.alert && <FlashMessage variant="danger">{messages.alert}</FlashMessage>}
        {messages.warning && <FlashMessage variant="warning">{messages.warning}</FlashMessage>}
        {messages.notice && <FlashMessage variant="success">{messages.notice}</FlashMessage>}
      </div>
    )
  }

  return null
}
