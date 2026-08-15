/**
 * Cloud Run service-to-service authentication.
 * Fetches an ID token from the metadata server to authenticate
 * the dashboard -> agent calls.
 */

const METADATA_SERVER = 'http://metadata.google.internal/computeMetadata/v1'
const AGENT_URL = process.env.AGENT_INTERNAL_URL || process.env.NEXT_PUBLIC_AGENT_URL || 'http://localhost:8080'

let cachedToken: { token: string; expiry: number } | null = null

/**
 * Get an ID token for authenticating to the agent Cloud Run service.
 * Uses the GCE metadata server (available inside Cloud Run).
 * Falls back gracefully in local dev (no auth header).
 */
export async function getIdToken(): Promise<string | null> {
  // In local development, skip auth
  if (process.env.NODE_ENV === 'development') {
    return null
  }

  // Return cached token if still valid (with 60s buffer)
  if (cachedToken && cachedToken.expiry > Date.now() + 60_000) {
    return cachedToken.token
  }

  try {
    const audience = AGENT_URL
    const tokenUrl = `${METADATA_SERVER}/instance/service-accounts/default/identity?audience=${encodeURIComponent(audience)}`

    const response = await fetch(tokenUrl, {
      headers: { 'Metadata-Flavor': 'Google' },
    })

    if (!response.ok) {
      console.error(`Failed to get ID token: ${response.status} ${response.statusText}`)
      return null
    }

    const token = await response.text()

    // ID tokens are JWTs - decode expiry from payload (base64)
    const parts = token.split('.')
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString())
      cachedToken = {
        token,
        expiry: payload.exp * 1000, // convert to milliseconds
      }
    }

    return token
  } catch (error) {
    console.error('Failed to fetch ID token from metadata server:', error)
    return null
  }
}

/**
 * Build headers for authenticated fetch to the agent service.
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  const token = await getIdToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  return headers
}

/**
 * Get the agent URL (internal URL in Cloud Run, public in dev).
 */
export function getAgentUrl(): string {
  return AGENT_URL
}
