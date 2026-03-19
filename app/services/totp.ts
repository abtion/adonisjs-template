import * as twoFactor from '2fa-node'
import { randomInt } from 'node:crypto'

export type TotpSecret = {
  secret: string
  uri: string
  qr: string
}

export async function generateSecret(userInfo: string): Promise<TotpSecret> {
  return await twoFactor.generateSecret({
    name: 'Project Name Human',
    account: userInfo,
    counter: undefined,
    numberOfSecretBytes: undefined,
  })
}

export function verifyToken(secret: string = '', token: string, recoveryCodes: string[] = []) {
  const verifyResult = twoFactor.verifyToken(secret, token)
  if (verifyResult) return verifyResult

  return recoveryCodes.includes(token)
}

export function generateRecoveryCodes(n = 16) {
  return Array.from({ length: n }, () => getRecoveryCode())
}

export function generateToken(secret: string) {
  return twoFactor.generateToken(secret)?.token
}

export function getRecoveryCode() {
  const chars = Array.from({ length: 10 }, () => getRandomChar())
  chars.splice(5, 0, ' ')

  return chars.join()
}

export function getRandomChar() {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const randomIndex = randomInt(0, charset.length)
  return charset[randomIndex]
}
