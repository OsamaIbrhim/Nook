const HINT_KEY = 'nook.session'
const LEGACY_USER_KEY = 'user'
const LEGACY_TOKEN_KEY = 'accessToken'

let accessToken: string | null = null

export const getAccessToken = () => accessToken
export const setAccessToken = (token: string | null) => {
  accessToken = token
}

function safely<T>(action: () => T, fallback: T): T {
  try {
    return action()
  } catch {
    return fallback
  }
}

export const hasSessionHint = () => safely(() => localStorage.getItem(HINT_KEY) === '1', false)
export const setSessionHint = () => safely(() => localStorage.setItem(HINT_KEY, '1'), undefined)

export function clearSession() {
  accessToken = null
  safely(() => localStorage.removeItem(HINT_KEY), undefined)
}

export function migrateLegacySession() {
  safely(() => {
    if (localStorage.getItem(LEGACY_USER_KEY) !== null) setSessionHint()
    localStorage.removeItem(LEGACY_USER_KEY)
    sessionStorage.removeItem(LEGACY_TOKEN_KEY)
  }, undefined)
}
