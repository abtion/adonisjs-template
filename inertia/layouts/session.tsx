import React from 'react'
import Logo from '~/components/Logo'
import backgroundImageUrl from '~/images/muffi-background-image.jpg'

export default function SessionLayout({ children }: React.PropsWithChildren) {
  return (
    <main className="w-full h-full md:flex">
      <div className="w-full h-full p-6 md:w-1/2">
        <Logo className="absolute" />
        <div className="flex items-center justify-center h-full">{children}</div>
      </div>
      <div
        className="hidden md:w-1/2 md:block md:h-full bg-cover"
        style={{ backgroundImage: `url('${backgroundImageUrl}')` }}
      ></div>
    </main>
  )
}
