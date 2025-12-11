/**
 * Shared API utility functions for making authenticated requests
 */

/**
 * Get the CSRF token from cookies
 */
export function getCsrfToken(): string {
  const match = document.cookie.match(new RegExp('(^| )XSRF-TOKEN=([^;]+)'))
  return match ? decodeURIComponent(match[2]) : ''
}

/**
 * Make an authenticated JSON request to the server
 * @param url - The endpoint URL
 * @param payload - Optional request body payload
 * @param method - HTTP method (defaults to 'POST')
 * @returns Promise resolving to the response data
 */
export async function postJson<T = any>(
  url: string,
  payload?: Record<string, unknown>,
  method: string = 'POST'
): Promise<T> {
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
