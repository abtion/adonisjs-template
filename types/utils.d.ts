import { PageObject } from '@adonisjs/inertia/types'

export type InertiaProps<T> = T extends (
  ...args: any[]
) => Promise<string | PageObject<infer Props>>
  ? Props
  : never

export type RouteParams<T> = Parameters<T>[0] extends { params: infer params } ? params : never
