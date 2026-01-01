import React from 'react'
import { FlashMessages } from '~/components/FlashMessages'
import Logo from '~/components/Logo'
import backgroundImageUrl from '~/images/muffi-background-image.jpg'

export default function SessionLayout({ children }: React.PropsWithChildren) {
  return (
    <main className="h-full w-full md:flex">
      <div className="h-full w-full p-6 md:w-1/2">
        <Logo className="absolute" />
        <div className="flex h-full items-center justify-center">
          <FlashMessages className="container mx-auto my-4" />

          {children}
        </div>
      </div>
      <div
        className="hidden bg-cover md:block md:h-full md:w-1/2"
        style={{ backgroundImage: `url('${backgroundImageUrl}')` }}
      ></div>
    </main>
  )
}
