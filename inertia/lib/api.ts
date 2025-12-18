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
 * Custom error class that includes HTTP status code and error type
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: any,
    public errorType?:
      | 'network'
      | 'rateLimit'
      | 'validation'
      | 'authentication'
      | 'server'
      | 'unknown'
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/**
 * Determine error type based on status code and error message
 */
function determineErrorType(status: number, message: string): ApiError['errorType'] {
  if (status === 0 || status >= 500) {
    return 'server'
  }
  if (status === 401 || status === 403) {
    return 'authentication'
  }
  if (status === 429) {
    return 'rateLimit'
  }
  if (status >= 400 && status < 500) {
    return 'validation'
  }
  if (message.toLowerCase().includes('network') || message.toLowerCase().includes('fetch')) {
    return 'network'
  }
  return 'unknown'
}

/**
 * Make an authenticated JSON request to the server
 * @param url - The endpoint URL
 * @param payload - Optional request body payload
 * @param method - HTTP method (defaults to 'POST')
 * @returns Promise resolving to the response data
 * @throws {ApiError} When the request fails, includes status code and response data
 */
export async function postJson<T = any>(
  url: string,
  payload?: Record<string, unknown>,
  method: string = 'POST'
): Promise<T> {
  const csrf = getCsrfToken()

  let res: Response
  try {
    res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-XSRF-TOKEN': csrf,
      },
      body: payload ? JSON.stringify(payload) : undefined,
    })
  } catch (error) {
    // Network error (no response received)
    const networkError = error instanceof Error ? error : new Error('Network error')
    throw new ApiError(
      'Network connection error. Please check your internet connection and try again.',
      0,
      { originalError: networkError },
      'network'
    )
  }

  let data: any = {}
  try {
    data = await res.json()
  } catch {
    // Response is not JSON, use empty object
    data = {}
  }

  if (!res.ok) {
    const errorMessage = (data as any)?.message || 'Request failed'
    const errorType = determineErrorType(res.status, errorMessage)

    // Enhance error message for rate limiting
    if (res.status === 429) {
      const retryAfter = res.headers.get('Retry-After')
      const minutes = retryAfter ? Math.ceil(parseInt(retryAfter, 10) / 60) : undefined
      const enhancedMessage = minutes
        ? `Too many failed attempts. Please wait ${minutes} minutes before trying again.`
        : 'Too many failed attempts. Please wait a few minutes before trying again.'

      throw new ApiError(enhancedMessage, res.status, data, errorType)
    }

    throw new ApiError(errorMessage, res.status, data, errorType)
  }

  return data as T
}
