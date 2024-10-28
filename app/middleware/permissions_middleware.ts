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

export async function appendPermissionsToRecord<
  Target extends {},
  Policy extends Constructor<any>,
  Action extends RelevantActions<InstanceType<Policy>, SessionUser, Target>,
>(bouncer: HttpContext['bouncer'], target: Target, policy: Policy, actions?: Action[]) {
  if (actions) {
    const permissions = {} as Record<(typeof actions)[number], boolean>
    for (const action of actions) {
      // @ts-expect-error TypeScript does not infer that we only allow actions with the target
      //                  as parameter
      permissions[action] = await bouncer.with(policy).allows(action, target)
    }

    return { ...target, permissions }
  } else {
    const permissions = {} as Record<(typeof defaultActions)[number], boolean>

    for (const action of defaultActions) {
      // If one of the default actions is not implemented, it will be catched here
      if (!(action in policy.prototype)) {
        throw new Error(`${policy.name} does not have the action "${action as string}"`)
      }

      // @ts-expect-error The check above will throw an error if the action is not implemented
      //                  This will also let through the unlikely event that the policy
      //                  immplements the action but does not take the right parameters
      permissions[action] = await bouncer.with(policy).allows(action, target)
    }

    return { ...target, permissions }
  }
}

export async function appendPermissionsToRecords<
  Target extends {},
  Policy extends Constructor<any>,
  Action extends RelevantActions<InstanceType<Policy>, SessionUser, Target>,
>(bouncer: HttpContext['bouncer'], targets: Target[], policy: Policy, actions?: Action[]) {
  if (actions) {
    return await Promise.all(
      targets.map((target) =>
        appendPermissionsToRecord<Target, Policy, Action>(bouncer, target, policy, actions)
      )
    )
  } else {
    return await Promise.all(
      targets.map((target) =>
        appendPermissionsToRecord<Target, Policy, Action>(bouncer, target, policy)
      )
    )
  }
}

export default class InitializePermissionsMiddleware {
  async generatePermissionHelpers(ctx: HttpContext) {
    return {
      appendTo: <
        Target extends {},
        Policy extends Constructor<any>,
        Action extends RelevantActions<InstanceType<Policy>, SessionUser, Target>,
      >(
        target: Target,
        policy: Policy,
        actions?: Action[]
      ) => appendPermissionsToRecord(ctx.bouncer, target, policy, actions),

      appendToList: <
        Target extends {},
        Policy extends Constructor<any>,
        Action extends RelevantActions<InstanceType<Policy>, SessionUser, Target>,
      >(
        targets: Target[],
        policy: Policy,
        actions?: Action[]
      ) => appendPermissionsToRecords(ctx.bouncer, targets, policy, actions),
    }
  }

  async handle(ctx: HttpContext, next: NextFn) {
    ctx.permissions = await this.generatePermissionHelpers(ctx)
    return next()
  }
}

declare module '@adonisjs/core/http' {
  export interface HttpContext {
    permissions: Awaited<ReturnType<InitializePermissionsMiddleware['generatePermissionHelpers']>>
  }
}
