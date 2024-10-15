import { PropsWithChildren } from 'react'
import Nav from '~/components/Nav'

export default function MainLayout({ children }: PropsWithChildren) {
  return (
    <main className="w-full h-full">
      <Nav />
      {/* <%= render "shared/nav" if controller_name != "sessions" %> */}
      {/* <%= render "shared/flash_messages", container_class: "container mx-auto my-4" %> */}
      {children}
    </main>
  )
}
