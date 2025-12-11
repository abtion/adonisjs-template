import { useState } from 'react'
import { startRegistration } from '@simplewebauthn/browser'
import Button from '~/components/Button'

type Passkey = {
  id: number
  friendlyName: string | null
  createdAt: string | Date
  lastUsed: string | Date
}

type PasskeysProps = {
  initialPasskeys: Passkey[]
}

const getCsrfToken = () => {
  const match = document.cookie.match(new RegExp('(^| )XSRF-TOKEN=([^;]+)'))
  return match ? decodeURIComponent(match[2]) : ''
}

async function postJson<T = any>(
  url: string,
  payload?: Record<string, unknown>,
  method: string = 'POST'
) {
  const csrf = getCsrfToken()
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-XSRF-TOKEN': csrf,
    },
    body: payload ? JSON.stringify(payload) : undefined,
  })

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    throw new Error((data as any).message || 'Request failed')
  }

  return data as T
}

export default function Passkeys({ initialPasskeys }: PasskeysProps) {
  const [passkeys, setPasskeys] = useState<Passkey[]>(initialPasskeys)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const handle = async (fn: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    setStatus(null)
    try {
      await fn()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const registerPasskey = () =>
    handle(async () => {
      const { options } = await postJson<{ options: any }>('/2fa/webauthn/register/options')
      const attestation = await startRegistration(options)
      await postJson('/2fa/webauthn/register/verify', { attestation })
      setStatus('Passkey registered successfully.')
      // Reload to get updated passkeys list
      window.location.reload()
    })

  const removePasskey = (id: number) =>
    handle(async () => {
      await postJson(`/profile/passkeys/${id}`, {}, 'DELETE')
      setPasskeys(passkeys.filter((pk) => pk.id !== id))
      setStatus('Passkey removed successfully.')
    })

  return (
    <section className="rounded-md border border-neutral-300 p-4">
      <h2 className="mb-2 text-xl font-semibold">Passkeys</h2>
      <p className="text-gray-600 mb-4 text-sm">
        Use passkeys for passwordless sign-in. Works with Touch ID, Face ID, Windows Hello, or
        security keys.
      </p>

      {passkeys.length === 0 ? (
        <div>
          <p className="text-gray-700 mb-4 text-sm">No passkeys registered.</p>
          <Button onClick={registerPasskey} disabled={busy} variant="primary" size="md">
            Register Passkey
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <ul className="space-y-2">
            {passkeys.map((passkey) => (
              <li key={passkey.id} className="flex items-center justify-between rounded border border-neutral-300 p-3">
                <div>
                  <p className="font-medium">{passkey.friendlyName || `Passkey ${passkey.id}`}</p>
                  <p className="text-gray-500 text-sm">
                    Registered: {new Date(passkey.createdAt).toLocaleDateString()}
                    {passkey.lastUsed &&
                      ` | Last Used: ${new Date(passkey.lastUsed).toLocaleDateString()}`}
                  </p>
                </div>
                <Button
                  onClick={() => removePasskey(passkey.id)}
                  disabled={busy}
                  variant="danger"
                  size="sm"
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
          <Button onClick={registerPasskey} disabled={busy} variant="secondary" size="md">
            Register Another Passkey
          </Button>
        </div>
      )}

      {(status || error) && (
        <div
          className={`mt-4 rounded p-3 ${error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}
        >
          {error || status}
        </div>
      )}
    </section>
  )
}
