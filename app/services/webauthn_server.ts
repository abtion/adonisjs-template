import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server'

export const webauthnServer = {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
}

export type WebauthnServer = typeof webauthnServer
