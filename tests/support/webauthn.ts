import { fromBase64Url } from '#services/webauthn'
import crypto from 'node:crypto'
import { CDPSession } from 'playwright'

export function generateTestKeyPair() {
  // Generate a P-256 keypair suitable for WebAuthn
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'prime256v1',
  })

  // Private key in DER format
  const privateKeyDer = privateKey.export({ type: 'pkcs8', format: 'der' }) as Buffer

  // Public key in COSE format (AI generated code)
  const jwk = publicKey.export({ format: 'jwk' })
  const x = fromBase64Url(jwk.x!) // 32 bytes expected
  const y = fromBase64Url(jwk.y!) // 32 bytes expected

  const parts: Buffer[] = []
  parts.push(Buffer.from([0xa5])) // map of 5 pairs

  // 1: 2
  parts.push(Buffer.from([0x01])) // key 1
  parts.push(Buffer.from([0x02])) // value 2 (kty EC2)

  // 3: -7
  parts.push(Buffer.from([0x03])) // key 3
  parts.push(Buffer.from([0x26])) // value -7 encoded as negative int (0x20 + 6 = 0x26)

  // -1: 1 (crv)
  parts.push(Buffer.from([0x20])) // key -1
  parts.push(Buffer.from([0x01])) // value 1 (P-256)

  // -2: x (bstr(32))
  parts.push(Buffer.from([0x21])) // key -2
  parts.push(Buffer.from([0x58, 0x20])) // bstr, 1-byte length (0x58) then 0x20 (32)
  parts.push(x as Buffer)

  // -3: y (bstr(32))
  parts.push(Buffer.from([0x22])) // key -3
  parts.push(Buffer.from([0x58, 0x20]))
  parts.push(y as Buffer)

  const publicKeyCose = Buffer.concat(parts)

  return { privateKeyDer, publicKeyCose }
}

export async function initiateBrowserWebauthnAuthenticator(cdpSession: CDPSession) {
  await cdpSession.send('WebAuthn.enable')
  const { authenticatorId } = (await cdpSession.send('WebAuthn.addVirtualAuthenticator', {
    options: {
      protocol: 'ctap2',
      ctap2Version: 'ctap2_1',
      hasUserVerification: true,
      transport: 'usb',
      automaticPresenceSimulation: true,
      isUserVerified: true,
    },
  })) as { authenticatorId: string }

  return authenticatorId
}

export async function addBrowserWebauthnCredential(
  cdpSession: CDPSession,
  authenticatorId: string
) {
  const { privateKeyDer, publicKeyCose } = generateTestKeyPair()

  const credentialId = crypto.randomBytes(32)
  const credentialIdBase64 = credentialId.toString('base64')

  // Prepare payload with DER private key (base64) - first attempt
  const payloadDer = {
    authenticatorId,
    credential: {
      credentialId: credentialIdBase64,
      isResidentCredential: false,
      rpId: 'localhost',
      privateKey: privateKeyDer.toString('base64'),
      signCount: 1,
    },
  }

  await cdpSession.send('WebAuthn.addCredential', payloadDer)
  return { credentialId, publicKeyCose }
}
