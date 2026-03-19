import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'users.index': { paramsTuple?: []; params?: {} }
    'users.create': { paramsTuple?: []; params?: {} }
    'users.store': { paramsTuple?: []; params?: {} }
    'users.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'users.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'users.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'users.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'profile.show': { paramsTuple?: []; params?: {} }
    'profile_webauthn.options': { paramsTuple?: []; params?: {} }
    'profile_webauthn.store': { paramsTuple?: []; params?: {} }
    'profile_webauthn.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'profile_totp.store': { paramsTuple?: []; params?: {} }
    'profile_totp.verify': { paramsTuple?: []; params?: {} }
    'profile_totp.destroy': { paramsTuple?: []; params?: {} }
    'profile_totp.regenerate_recovery_codes': { paramsTuple?: []; params?: {} }
    'session_confirm_security.index': { paramsTuple?: []; params?: {} }
    'session_confirm_security.store': { paramsTuple?: []; params?: {} }
    'session.destroy': { paramsTuple?: []; params?: {} }
    'sign_in.index': { paramsTuple?: []; params?: {} }
    'sign_in.store': { paramsTuple?: []; params?: {} }
    'sign_in_email.index': { paramsTuple: [ParamValue]; params: {'email': ParamValue} }
    'sign_in_email.store': { paramsTuple: [ParamValue]; params: {'email': ParamValue} }
    'session_totp.index': { paramsTuple?: []; params?: {} }
    'session_totp.store': { paramsTuple?: []; params?: {} }
    'session_totp_recover.index': { paramsTuple?: []; params?: {} }
    'session_totp_recover.store': { paramsTuple?: []; params?: {} }
    'colors': { paramsTuple?: []; params?: {} }
  }
  GET: {
    'users.index': { paramsTuple?: []; params?: {} }
    'users.create': { paramsTuple?: []; params?: {} }
    'users.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'users.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'profile.show': { paramsTuple?: []; params?: {} }
    'profile_webauthn.options': { paramsTuple?: []; params?: {} }
    'session_confirm_security.index': { paramsTuple?: []; params?: {} }
    'sign_in.index': { paramsTuple?: []; params?: {} }
    'sign_in_email.index': { paramsTuple: [ParamValue]; params: {'email': ParamValue} }
    'session_totp.index': { paramsTuple?: []; params?: {} }
    'session_totp_recover.index': { paramsTuple?: []; params?: {} }
    'colors': { paramsTuple?: []; params?: {} }
  }
  HEAD: {
    'users.index': { paramsTuple?: []; params?: {} }
    'users.create': { paramsTuple?: []; params?: {} }
    'users.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'users.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'profile.show': { paramsTuple?: []; params?: {} }
    'profile_webauthn.options': { paramsTuple?: []; params?: {} }
    'session_confirm_security.index': { paramsTuple?: []; params?: {} }
    'sign_in.index': { paramsTuple?: []; params?: {} }
    'sign_in_email.index': { paramsTuple: [ParamValue]; params: {'email': ParamValue} }
    'session_totp.index': { paramsTuple?: []; params?: {} }
    'session_totp_recover.index': { paramsTuple?: []; params?: {} }
    'colors': { paramsTuple?: []; params?: {} }
  }
  POST: {
    'users.store': { paramsTuple?: []; params?: {} }
    'profile_webauthn.store': { paramsTuple?: []; params?: {} }
    'profile_totp.store': { paramsTuple?: []; params?: {} }
    'profile_totp.verify': { paramsTuple?: []; params?: {} }
    'profile_totp.regenerate_recovery_codes': { paramsTuple?: []; params?: {} }
    'session_confirm_security.store': { paramsTuple?: []; params?: {} }
    'sign_in.store': { paramsTuple?: []; params?: {} }
    'sign_in_email.store': { paramsTuple: [ParamValue]; params: {'email': ParamValue} }
    'session_totp.store': { paramsTuple?: []; params?: {} }
    'session_totp_recover.store': { paramsTuple?: []; params?: {} }
  }
  PUT: {
    'users.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  PATCH: {
    'users.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  DELETE: {
    'users.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'profile_webauthn.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'profile_totp.destroy': { paramsTuple?: []; params?: {} }
    'session.destroy': { paramsTuple?: []; params?: {} }
  }
  OPTIONS: {
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}