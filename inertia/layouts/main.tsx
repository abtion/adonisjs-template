import { PropsWithChildren } from 'react'
import { FlashMessages } from '~/components/FlashMessages'
import Nav from '~/components/Nav'

export default function MainLayout({ children }: PropsWithChildren) {
  return (
    <main className="w-full h-full">
      <Nav />
      <FlashMessages className="container mx-auto my-4" />
      {children}
    </main>
  )
}
