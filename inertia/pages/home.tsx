import { type presenter } from '#start/routes'
import { Head } from '@inertiajs/react'

export default function Home(props: Awaited<ReturnType<typeof presenter>>) {
  return (
    <>
      <Head title="Homepage" />

      <div className="container">
        <div className="title">AdonisJS {props.version} x Inertia x React</div>

        <h1>{props.book?.author_name}</h1>

        <span>
          Learn more about AdonisJS and Inertia.js by visiting the{' '}
          <a href="https://docs.adonisjs.com/guides/inertia">AdonisJS documentation</a>.
        </span>
      </div>
    </>
  )
}
