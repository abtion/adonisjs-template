/* eslint-disable prettier/prettier */
import type { AdonisEndpoint } from '@tuyau/core/types'
import type { Registry } from './schema.d.ts'
import type { ApiDefinition } from './tree.d.ts'

const placeholder: any = {}

const routes = {
  'users.index': {
    methods: ["GET","HEAD"],
    pattern: '/users',
    tokens: [{"old":"/users","type":0,"val":"users","end":""}],
    types: placeholder as Registry['users.index']['types'],
  },
  'users.create': {
    methods: ["GET","HEAD"],
    pattern: '/users/create',
    tokens: [{"old":"/users/create","type":0,"val":"users","end":""},{"old":"/users/create","type":0,"val":"create","end":""}],
    types: placeholder as Registry['users.create']['types'],
  },
  'users.store': {
    methods: ["POST"],
    pattern: '/users',
    tokens: [{"old":"/users","type":0,"val":"users","end":""}],
    types: placeholder as Registry['users.store']['types'],
  },
  'users.show': {
    methods: ["GET","HEAD"],
    pattern: '/users/:id',
    tokens: [{"old":"/users/:id","type":0,"val":"users","end":""},{"old":"/users/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['users.show']['types'],
  },
  'users.edit': {
    methods: ["GET","HEAD"],
    pattern: '/users/:id/edit',
    tokens: [{"old":"/users/:id/edit","type":0,"val":"users","end":""},{"old":"/users/:id/edit","type":1,"val":"id","end":""},{"old":"/users/:id/edit","type":0,"val":"edit","end":""}],
    types: placeholder as Registry['users.edit']['types'],
  },
  'users.update': {
    methods: ["PUT","PATCH"],
    pattern: '/users/:id',
    tokens: [{"old":"/users/:id","type":0,"val":"users","end":""},{"old":"/users/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['users.update']['types'],
  },
  'users.destroy': {
    methods: ["DELETE"],
    pattern: '/users/:id',
    tokens: [{"old":"/users/:id","type":0,"val":"users","end":""},{"old":"/users/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['users.destroy']['types'],
  },
  'profile.show': {
    methods: ["GET","HEAD"],
    pattern: '/profile',
    tokens: [{"old":"/profile","type":0,"val":"profile","end":""}],
    types: placeholder as Registry['profile.show']['types'],
  },
  'profile_webauthn.options': {
    methods: ["GET","HEAD"],
    pattern: '/profile/webauthn/options',
    tokens: [{"old":"/profile/webauthn/options","type":0,"val":"profile","end":""},{"old":"/profile/webauthn/options","type":0,"val":"webauthn","end":""},{"old":"/profile/webauthn/options","type":0,"val":"options","end":""}],
    types: placeholder as Registry['profile_webauthn.options']['types'],
  },
  'profile_webauthn.store': {
    methods: ["POST"],
    pattern: '/profile/webauthn',
    tokens: [{"old":"/profile/webauthn","type":0,"val":"profile","end":""},{"old":"/profile/webauthn","type":0,"val":"webauthn","end":""}],
    types: placeholder as Registry['profile_webauthn.store']['types'],
  },
  'profile_webauthn.destroy': {
    methods: ["DELETE"],
    pattern: '/profile/webauthn/:id',
    tokens: [{"old":"/profile/webauthn/:id","type":0,"val":"profile","end":""},{"old":"/profile/webauthn/:id","type":0,"val":"webauthn","end":""},{"old":"/profile/webauthn/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['profile_webauthn.destroy']['types'],
  },
  'profile_totp.store': {
    methods: ["POST"],
    pattern: '/profile/totp',
    tokens: [{"old":"/profile/totp","type":0,"val":"profile","end":""},{"old":"/profile/totp","type":0,"val":"totp","end":""}],
    types: placeholder as Registry['profile_totp.store']['types'],
  },
  'profile_totp.verify': {
    methods: ["POST"],
    pattern: '/profile/totp/verify',
    tokens: [{"old":"/profile/totp/verify","type":0,"val":"profile","end":""},{"old":"/profile/totp/verify","type":0,"val":"totp","end":""},{"old":"/profile/totp/verify","type":0,"val":"verify","end":""}],
    types: placeholder as Registry['profile_totp.verify']['types'],
  },
  'profile_totp.destroy': {
    methods: ["DELETE"],
    pattern: '/profile/totp',
    tokens: [{"old":"/profile/totp","type":0,"val":"profile","end":""},{"old":"/profile/totp","type":0,"val":"totp","end":""}],
    types: placeholder as Registry['profile_totp.destroy']['types'],
  },
  'profile_totp.regenerate_recovery_codes': {
    methods: ["POST"],
    pattern: '/profile/totp/regeneration',
    tokens: [{"old":"/profile/totp/regeneration","type":0,"val":"profile","end":""},{"old":"/profile/totp/regeneration","type":0,"val":"totp","end":""},{"old":"/profile/totp/regeneration","type":0,"val":"regeneration","end":""}],
    types: placeholder as Registry['profile_totp.regenerate_recovery_codes']['types'],
  },
  'session_confirm_security.index': {
    methods: ["GET","HEAD"],
    pattern: '/session/confirm-security',
    tokens: [{"old":"/session/confirm-security","type":0,"val":"session","end":""},{"old":"/session/confirm-security","type":0,"val":"confirm-security","end":""}],
    types: placeholder as Registry['session_confirm_security.index']['types'],
  },
  'session_confirm_security.store': {
    methods: ["POST"],
    pattern: '/session/confirm-security',
    tokens: [{"old":"/session/confirm-security","type":0,"val":"session","end":""},{"old":"/session/confirm-security","type":0,"val":"confirm-security","end":""}],
    types: placeholder as Registry['session_confirm_security.store']['types'],
  },
  'session.destroy': {
    methods: ["DELETE"],
    pattern: '/session',
    tokens: [{"old":"/session","type":0,"val":"session","end":""}],
    types: placeholder as Registry['session.destroy']['types'],
  },
  'sign_in.index': {
    methods: ["GET","HEAD"],
    pattern: '/sign-in',
    tokens: [{"old":"/sign-in","type":0,"val":"sign-in","end":""}],
    types: placeholder as Registry['sign_in.index']['types'],
  },
  'sign_in.store': {
    methods: ["POST"],
    pattern: '/sign-in',
    tokens: [{"old":"/sign-in","type":0,"val":"sign-in","end":""}],
    types: placeholder as Registry['sign_in.store']['types'],
  },
  'sign_in_email.index': {
    methods: ["GET","HEAD"],
    pattern: '/sign-in/:email',
    tokens: [{"old":"/sign-in/:email","type":0,"val":"sign-in","end":""},{"old":"/sign-in/:email","type":1,"val":"email","end":""}],
    types: placeholder as Registry['sign_in_email.index']['types'],
  },
  'sign_in_email.store': {
    methods: ["POST"],
    pattern: '/sign-in/:email',
    tokens: [{"old":"/sign-in/:email","type":0,"val":"sign-in","end":""},{"old":"/sign-in/:email","type":1,"val":"email","end":""}],
    types: placeholder as Registry['sign_in_email.store']['types'],
  },
  'session_totp.index': {
    methods: ["GET","HEAD"],
    pattern: '/session/totp',
    tokens: [{"old":"/session/totp","type":0,"val":"session","end":""},{"old":"/session/totp","type":0,"val":"totp","end":""}],
    types: placeholder as Registry['session_totp.index']['types'],
  },
  'session_totp.store': {
    methods: ["POST"],
    pattern: '/session/totp',
    tokens: [{"old":"/session/totp","type":0,"val":"session","end":""},{"old":"/session/totp","type":0,"val":"totp","end":""}],
    types: placeholder as Registry['session_totp.store']['types'],
  },
  'session_totp_recover.index': {
    methods: ["GET","HEAD"],
    pattern: '/session/totp/recover',
    tokens: [{"old":"/session/totp/recover","type":0,"val":"session","end":""},{"old":"/session/totp/recover","type":0,"val":"totp","end":""},{"old":"/session/totp/recover","type":0,"val":"recover","end":""}],
    types: placeholder as Registry['session_totp_recover.index']['types'],
  },
  'session_totp_recover.store': {
    methods: ["POST"],
    pattern: '/session/totp/recover',
    tokens: [{"old":"/session/totp/recover","type":0,"val":"session","end":""},{"old":"/session/totp/recover","type":0,"val":"totp","end":""},{"old":"/session/totp/recover","type":0,"val":"recover","end":""}],
    types: placeholder as Registry['session_totp_recover.store']['types'],
  },
  'colors': {
    methods: ["GET","HEAD"],
    pattern: '/colors.css',
    tokens: [{"old":"/colors.css","type":0,"val":"colors.css","end":""}],
    types: placeholder as Registry['colors']['types'],
  },
} as const satisfies Record<string, AdonisEndpoint>

export { routes }

export const registry = {
  routes,
  $tree: {} as ApiDefinition,
}

declare module '@tuyau/core/types' {
  export interface UserRegistry {
    routes: typeof routes
    $tree: ApiDefinition
  }
}
