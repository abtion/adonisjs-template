import { PageObject } from '@adonisjs/inertia/types'

export type InertiaProps<T> = T extends (
  ...args: any[]
) => Promise<string | void | PageObject<infer Props>>
  ? Props
  : never
