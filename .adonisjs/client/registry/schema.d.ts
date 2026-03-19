/* eslint-disable prettier/prettier */
/// <reference path="../manifest.d.ts" />

import type { ExtractBody, ExtractErrorResponse, ExtractQuery, ExtractQueryForGet, ExtractResponse } from '@tuyau/core/types'
import type { InferInput, SimpleError } from '@vinejs/vine/types'

export type ParamValue = string | number | bigint | boolean

export interface Registry {
  'users.index': {
    methods: ["GET","HEAD"]
    pattern: '/users'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/users_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/users_controller').default['index']>>>
    }
  }
  'users.create': {
    methods: ["GET","HEAD"]
    pattern: '/users/create'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/users_controller').default['create']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/users_controller').default['create']>>>
    }
  }
  'users.store': {
    methods: ["POST"]
    pattern: '/users'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/user_validator').createUserValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/user_validator').createUserValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/users_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/users_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'users.show': {
    methods: ["GET","HEAD"]
    pattern: '/users/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/users_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/users_controller').default['show']>>>
    }
  }
  'users.edit': {
    methods: ["GET","HEAD"]
    pattern: '/users/:id/edit'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/users_controller').default['edit']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/users_controller').default['edit']>>>
    }
  }
  'users.update': {
    methods: ["PUT","PATCH"]
    pattern: '/users/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/user_validator').updateUserValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/user_validator').updateUserValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/users_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/users_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'users.destroy': {
    methods: ["DELETE"]
    pattern: '/users/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/users_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/users_controller').default['destroy']>>>
    }
  }
  'profile.show': {
    methods: ["GET","HEAD"]
    pattern: '/profile'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/profile_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/profile_controller').default['show']>>>
    }
  }
  'profile_webauthn.options': {
    methods: ["GET","HEAD"]
    pattern: '/profile/webauthn/options'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/profile/webauthn_controller').default['options']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/profile/webauthn_controller').default['options']>>>
    }
  }
  'profile_webauthn.store': {
    methods: ["POST"]
    pattern: '/profile/webauthn'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/profile/webauthn_validator').createOtpValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/profile/webauthn_validator').createOtpValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/profile/webauthn_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/profile/webauthn_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'profile_webauthn.destroy': {
    methods: ["DELETE"]
    pattern: '/profile/webauthn/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/profile/webauthn_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/profile/webauthn_controller').default['destroy']>>>
    }
  }
  'profile_totp.store': {
    methods: ["POST"]
    pattern: '/profile/totp'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/profile/totp_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/profile/totp_controller').default['store']>>>
    }
  }
  'profile_totp.verify': {
    methods: ["POST"]
    pattern: '/profile/totp/verify'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/profile/totp_validator').postOtpValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/profile/totp_validator').postOtpValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/profile/totp_controller').default['verify']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/profile/totp_controller').default['verify']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'profile_totp.destroy': {
    methods: ["DELETE"]
    pattern: '/profile/totp'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/profile/totp_validator').destroyTotpValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/profile/totp_validator').destroyTotpValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/profile/totp_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/profile/totp_controller').default['destroy']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'profile_totp.regenerate_recovery_codes': {
    methods: ["POST"]
    pattern: '/profile/totp/regeneration'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/profile/totp_controller').default['regenerateRecoveryCodes']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/profile/totp_controller').default['regenerateRecoveryCodes']>>>
    }
  }
  'session_confirm_security.index': {
    methods: ["GET","HEAD"]
    pattern: '/session/confirm-security'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/session/confirm_security_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/session/confirm_security_controller').default['index']>>>
    }
  }
  'session_confirm_security.store': {
    methods: ["POST"]
    pattern: '/session/confirm-security'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/session/confirm_security').confirmSecurityValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/session/confirm_security').confirmSecurityValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/session/confirm_security_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/session/confirm_security_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'session.destroy': {
    methods: ["DELETE"]
    pattern: '/session'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/session_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/session_controller').default['destroy']>>>
    }
  }
  'sign_in.index': {
    methods: ["GET","HEAD"]
    pattern: '/sign-in'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/sign_in_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/sign_in_controller').default['index']>>>
    }
  }
  'sign_in.store': {
    methods: ["POST"]
    pattern: '/sign-in'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/sign_in_validator').signInValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/sign_in_validator').signInValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/sign_in_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/sign_in_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'sign_in_email.index': {
    methods: ["GET","HEAD"]
    pattern: '/sign-in/:email'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { email: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/session_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/session_controller').default['index']>>>
    }
  }
  'sign_in_email.store': {
    methods: ["POST"]
    pattern: '/sign-in/:email'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/session_validator').createSessionValidator)>>
      paramsTuple: [ParamValue]
      params: { email: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/session_validator').createSessionValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/session_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/session_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'session_totp.index': {
    methods: ["GET","HEAD"]
    pattern: '/session/totp'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/session/totp_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/session/totp_controller').default['index']>>>
    }
  }
  'session_totp.store': {
    methods: ["POST"]
    pattern: '/session/totp'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/session/totp_validator').postOtpValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/session/totp_validator').postOtpValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/session/totp_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/session/totp_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'session_totp_recover.index': {
    methods: ["GET","HEAD"]
    pattern: '/session/totp/recover'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/session/totp_recover_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/session/totp_recover_controller').default['index']>>>
    }
  }
  'session_totp_recover.store': {
    methods: ["POST"]
    pattern: '/session/totp/recover'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/session/totp_recover_validator').postOtpRecoverValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/session/totp_recover_validator').postOtpRecoverValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/session/totp_recover_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/session/totp_recover_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'colors': {
    methods: ["GET","HEAD"]
    pattern: '/colors.css'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/colors_controller').default['handle']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/colors_controller').default['handle']>>>
    }
  }
}
