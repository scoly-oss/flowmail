const CLIENT_ID = '745559793732-33kduvip29uud0piuvcouq8vnionoorj.apps.googleusercontent.com'
const SCOPES = 'https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/gmail.compose https://www.googleapis.com/auth/gmail.send'

let tokenClient: google.accounts.oauth2.TokenClient | null = null
let accessToken: string | null = null

interface TokenResponse {
  access_token: string
  expires_in: number
  scope: string
  token_type: string
  error?: string
}

function waitForGsi(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof google !== 'undefined' && google.accounts?.oauth2) {
      resolve()
      return
    }
    const interval = setInterval(() => {
      if (typeof google !== 'undefined' && google.accounts?.oauth2) {
        clearInterval(interval)
        resolve()
      }
    }, 100)
  })
}

export async function initAuth(onSuccess: (token: string) => void, onError: (err: string) => void): Promise<void> {
  const stored = sessionStorage.getItem('flowmail_token')
  if (stored) {
    accessToken = stored
    onSuccess(stored)
  }

  try {
    await waitForGsi()
  } catch {
    onError('Google Identity Services failed to load')
    return
  }

  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: (response: TokenResponse) => {
      if (response.error) {
        onError(response.error)
        return
      }
      accessToken = response.access_token
      sessionStorage.setItem('flowmail_token', response.access_token)
      onSuccess(response.access_token)
    },
  })
}

export function requestLogin(): void {
  if (tokenClient) {
    tokenClient.requestAccessToken({ prompt: 'consent' })
  }
}

export function getToken(): string | null {
  return accessToken
}

export function logout(): void {
  if (accessToken && typeof google !== 'undefined' && google.accounts?.oauth2) {
    google.accounts.oauth2.revoke(accessToken, () => {})
  }
  accessToken = null
  sessionStorage.removeItem('flowmail_token')
  window.location.reload()
}

declare global {
  namespace google.accounts.oauth2 {
    function initTokenClient(config: {
      client_id: string
      scope: string
      callback: (response: TokenResponse) => void
    }): TokenClient

    function revoke(token: string, callback: () => void): void

    interface TokenClient {
      requestAccessToken(config?: { prompt?: string }): void
    }
  }
}
