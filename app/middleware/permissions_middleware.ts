import { AuthorizerResponse, Constructor, GetPolicyMethods } from '@adonisjs/bouncer/types'

import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { SessionUser } from '../auth_providers/session_user_provider.js'

const defaultActions = ['show', 'edit', 'destroy'] as const

export type RelevantActions<PolicyInstance, UserType, TargetType> = {
  [Key in keyof PolicyInstance]: Key extends GetPolicyMethods<UserType, PolicyInstance>
    ? PolicyInstance[Key] extends (...args: infer Args) => AuthorizerResponse
      ? [UserType, TargetType] extends Args
        ? Key
        : never
      : never
    : never
}[keyof PolicyInstance]

type AppendTo = <
  Target extends {},
  Policy extends Constructor<any>,
  Action extends RelevantActions<InstanceType<Policy>, SessionUser, Target>,
>(
  target: Target,
  policy: Policy,
  actions?: Action[]
) => Promise<
  Target & {
    permissions: Record<
      (typeof actions extends [] ? typeof actions : typeof defaultActions)[number],
      boolean
    >
  }
>

type AppendToList = <
  Target extends {},
  Policy extends Constructor<any>,
  Action extends RelevantActions<InstanceType<Policy>, SessionUser, Target>,
>(
  target: Target[],
  policy: Policy,
  actions?: Action[]
) => Promise<
  (Target & {
    permissions: Record<
      (typeof actions extends [] ? typeof actions : typeof defaultActions)[number],
      boolean
    >
  })[]
>

export default class InitializePermissionsMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const appendTo: AppendTo = async function (
      target,
      policy,
      // @ts-expect-error A runtime check catches if one of the default actions is not implemented
      actions = defaultActions
    ) {
      const permissions = {} as Record<
        (typeof actions extends [] ? typeof actions : typeof defaultActions)[number],
        boolean
      >

      await Promise.all(
        actions.map(async (action) => {
          // If one of the default actions is not implemented, it will be catched here
          if (!(action in policy.prototype)) {
            throw new Error(`${policy.name} does not have the action "${action as string}"`)
          }

          // @ts-expect-error TypeScript does not infer that we only allow actions with the target
          //                  as parameter
          permissions[action] = await ctx.bouncer.with(policy).allows(action, target)
        })
      )

      return {
        ...target,
        permissions,
      }
    }

    const appendToList: AppendToList = async function (targets, policy, actions) {
      return await Promise.all(targets.map((target) => appendTo(target, policy, actions)))
    }

    ctx.permissions = {
      appendTo,
      appendToList,
    }

    return next()
  }
}

declare module '@adonisjs/core/http' {
  export interface HttpContext {
    permissions: {
      appendTo: AppendTo
      appendToList: AppendToList
    }
  }
}
