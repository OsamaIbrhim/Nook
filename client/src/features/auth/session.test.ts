import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearSession,
  getAccessToken,
  hasSessionHint,
  migrateLegacySession,
  setAccessToken,
  setSessionHint
} from './session'

beforeEach(() => {
  setAccessToken(null)
})

describe('access token', () => {
  it('is kept in memory only: setting it writes nothing to localStorage or sessionStorage', () => {
    setAccessToken('secret-token')
    expect(getAccessToken()).toBe('secret-token')
    expect(localStorage.length).toBe(0)
    expect(sessionStorage.length).toBe(0)
  })

  it('is gone after clearSession, which also removes the hint', () => {
    setAccessToken('secret-token')
    setSessionHint()
    clearSession()
    expect(getAccessToken()).toBeNull()
    expect(hasSessionHint()).toBe(false)
  })
})

describe('session hint', () => {
  it('is false for a guest and true after setSessionHint, stored under nook.session', () => {
    expect(hasSessionHint()).toBe(false)
    setSessionHint()
    expect(hasSessionHint()).toBe(true)
    expect(Object.keys(localStorage)).toEqual(['nook.session'])
  })

  it('stores nothing about the user: the value is a flag, not a name, email or token', () => {
    setSessionHint()
    expect(localStorage.getItem('nook.session')).toBe('1')
  })
})

describe('migrateLegacySession', () => {
  it('treats the old user entry as the hint so an upgrade does not sign people out, then deletes the old keys', () => {
    localStorage.setItem('user', JSON.stringify({ name: 'Maya', email: 'maya@example.test' }))
    sessionStorage.setItem('accessToken', 'old-token')
    migrateLegacySession()
    expect(hasSessionHint()).toBe(true)
    expect(localStorage.getItem('user')).toBeNull()
    expect(sessionStorage.getItem('accessToken')).toBeNull()
    expect(getAccessToken()).toBeNull()
  })

  it('removes a leftover access token for a guest without creating a hint', () => {
    sessionStorage.setItem('accessToken', 'old-token')
    migrateLegacySession()
    expect(sessionStorage.getItem('accessToken')).toBeNull()
    expect(hasSessionHint()).toBe(false)
  })

  it('does nothing when there are no legacy keys', () => {
    migrateLegacySession()
    expect(localStorage.length).toBe(0)
  })
})
