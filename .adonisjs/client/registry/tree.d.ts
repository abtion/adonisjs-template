/* eslint-disable prettier/prettier */
import type { routes } from './index.ts'

export interface ApiDefinition {
  users: {
    index: typeof routes['users.index']
    create: typeof routes['users.create']
    store: typeof routes['users.store']
    show: typeof routes['users.show']
    edit: typeof routes['users.edit']
    update: typeof routes['users.update']
    destroy: typeof routes['users.destroy']
  }
  profile: {
    show: typeof routes['profile.show']
  }
  profileWebauthn: {
    options: typeof routes['profile_webauthn.options']
    store: typeof routes['profile_webauthn.store']
    destroy: typeof routes['profile_webauthn.destroy']
  }
  profileTotp: {
    store: typeof routes['profile_totp.store']
    verify: typeof routes['profile_totp.verify']
    destroy: typeof routes['profile_totp.destroy']
    regenerateRecoveryCodes: typeof routes['profile_totp.regenerate_recovery_codes']
  }
  sessionConfirmSecurity: {
    index: typeof routes['session_confirm_security.index']
    store: typeof routes['session_confirm_security.store']
  }
  session: {
    destroy: typeof routes['session.destroy']
  }
  signIn: {
    index: typeof routes['sign_in.index']
    store: typeof routes['sign_in.store']
  }
  signInEmail: {
    index: typeof routes['sign_in_email.index']
    store: typeof routes['sign_in_email.store']
  }
  sessionTotp: {
    index: typeof routes['session_totp.index']
    store: typeof routes['session_totp.store']
  }
  sessionTotpRecover: {
    index: typeof routes['session_totp_recover.index']
    store: typeof routes['session_totp_recover.store']
  }
  colors: typeof routes['colors']
}
