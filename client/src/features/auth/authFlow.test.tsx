import { act, renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import type { ReactNode } from 'react'
import { Provider } from 'react-redux'
import { afterEach, describe, expect, it } from 'vitest'
import { createStore } from '../../app/store'
import { request } from '../../shared/http/client'
import type { User } from '../../shared/contract/types'
import { server } from '../../test/server'
import { useLoginMutation, useLogoutMutation, useRegisterMutation } from './api'
import { getAccessToken, hasSessionHint, setSessionHint } from './session'

const api = (path: string) => `http://localhost:3000/api/v1${path}`
const maya: User = {
  _id: 'a'.repeat(24),
  name: 'Maya Hassan',
  email: 'maya@example.test',
  role: 'customer',
  isActive: true,
  createdAt: '2026-11-01T10:00:00.000Z'
}
const envelope = (data: unknown, status = 200) => HttpResponse.json({ success: true, data }, { status })
const rejected = (message: string) =>
  HttpResponse.json({ success: false, error: { message, code: 'unauthorized' } }, { status: 401 })
const everyStoredValue = () => [...Object.values(localStorage), ...Object.values(sessionStorage)].join('|')

function mount() {
  const store = createStore()
  const wrapper = ({ children }: { children: ReactNode }) => <Provider store={store}>{children}</Provider>
  return { store, wrapper }
}

afterEach(() => server.events.removeAllListeners())

describe('a guest', () => {
  it('starts as guest and makes no request at all', async () => {
    const requests: string[] = []
    server.events.on('request:start', ({ request: seen }) => requests.push(new URL(seen.url).pathname))
    const { store } = mount()
    await new Promise((resolve) => setTimeout(resolve, 30))
    expect(store.getState().auth).toEqual({ user: null, status: 'guest' })
    expect(requests).toEqual([])
  })
})

describe('a returning user (session hint present)', () => {
  it('is unknown until the refresh cookie is exchanged in ONE request that returns the user', async () => {
    setSessionHint()
    let refreshCalls = 0
    server.use(
      http.post(api('/auth/refresh'), () => {
        refreshCalls += 1
        return envelope({ user: maya, accessToken: 'fresh-token' })
      })
    )
    const { store } = mount()
    expect(store.getState().auth.status).toBe('unknown')
    await waitFor(() => expect(store.getState().auth.status).toBe('authenticated'))
    expect(store.getState().auth.user).toEqual(maya)
    expect(getAccessToken()).toBe('fresh-token')
    expect(refreshCalls).toBe(1)
  })

  it('keeps the token out of every storage and out of the Redux state', async () => {
    setSessionHint()
    server.use(http.post(api('/auth/refresh'), () => envelope({ user: maya, accessToken: 'fresh-token' })))
    const { store } = mount()
    await waitFor(() => expect(store.getState().auth.status).toBe('authenticated'))
    expect(everyStoredValue()).not.toContain('fresh-token')
    expect(Object.keys(localStorage)).toEqual(['nook.session'])
    expect(sessionStorage.length).toBe(0)
    expect(JSON.stringify(store.getState())).not.toContain('fresh-token')
  })

  it('becomes a guest and drops the hint when the cookie is gone (204)', async () => {
    setSessionHint()
    server.use(http.post(api('/auth/refresh'), () => new HttpResponse(null, { status: 204 })))
    const { store } = mount()
    await waitFor(() => expect(store.getState().auth.status).toBe('guest'))
    expect(hasSessionHint()).toBe(false)
  })

  it('becomes a guest and drops the hint when the refresh token is rejected (401)', async () => {
    setSessionHint()
    server.use(http.post(api('/auth/refresh'), () => rejected('Refresh token reuse detected')))
    const { store } = mount()
    await waitFor(() => expect(store.getState().auth.status).toBe('guest'))
    expect(hasSessionHint()).toBe(false)
  })

  it('becomes a guest but keeps the hint when the network fails, so a later reload can still restore', async () => {
    setSessionHint()
    server.use(http.post(api('/auth/refresh'), () => HttpResponse.error()))
    const { store } = mount()
    await waitFor(() => expect(store.getState().auth.status).toBe('guest'))
    expect(hasSessionHint()).toBe(true)
  })

  it('keeps a user who signed in with the previous version: the old user entry becomes the hint', async () => {
    localStorage.setItem('user', JSON.stringify(maya))
    server.use(http.post(api('/auth/refresh'), () => envelope({ user: maya, accessToken: 'fresh-token' })))
    const { store } = mount()
    await waitFor(() => expect(store.getState().auth.status).toBe('authenticated'))
    expect(localStorage.getItem('user')).toBeNull()
  })
})

describe('login and register', () => {
  it('login stores the user, keeps the token in memory, sets the hint and sends no Authorization header', async () => {
    let authorization: string | null = 'unset'
    let body: unknown
    server.use(
      http.post(api('/auth/login'), async ({ request: seen }) => {
        authorization = seen.headers.get('authorization')
        body = await seen.json()
        return envelope({ user: maya, accessToken: 'login-token' })
      })
    )
    const { store, wrapper } = mount()
    const { result } = renderHook(() => useLoginMutation(), { wrapper })
    await act(async () => {
      await result.current[0]({ email: 'maya@example.test', password: 'Passw0rd-test' }).unwrap()
    })
    expect(store.getState().auth).toEqual({ user: maya, status: 'authenticated' })
    expect(getAccessToken()).toBe('login-token')
    expect(hasSessionHint()).toBe(true)
    expect(everyStoredValue()).not.toContain('login-token')
    expect(authorization).toBeNull()
    expect(body).toEqual({ email: 'maya@example.test', password: 'Passw0rd-test' })
  })

  it('a wrong password leaves the user a guest and does not try to refresh a session', async () => {
    const paths: string[] = []
    server.events.on('request:start', ({ request: seen }) => paths.push(new URL(seen.url).pathname))
    server.use(http.post(api('/auth/login'), () => rejected('Invalid email or password')))
    const { store, wrapper } = mount()
    const { result } = renderHook(() => useLoginMutation(), { wrapper })
    await act(async () => {
      await expect(
        result.current[0]({ email: 'maya@example.test', password: 'wrong-password' }).unwrap()
      ).rejects.toMatchObject({ status: 401, message: 'Invalid email or password' })
    })
    expect(store.getState().auth.status).toBe('guest')
    expect(paths).toEqual(['/api/v1/auth/login'])
  })

  it('register signs the new customer in the same way', async () => {
    server.use(http.post(api('/auth/register'), () => envelope({ user: maya, accessToken: 'register-token' }, 201)))
    const { store, wrapper } = mount()
    const { result } = renderHook(() => useRegisterMutation(), { wrapper })
    await act(async () => {
      await result.current[0]({ name: 'Maya Hassan', email: 'maya@example.test', password: 'Passw0rd-test' }).unwrap()
    })
    expect(store.getState().auth.user).toEqual(maya)
    expect(getAccessToken()).toBe('register-token')
    expect(hasSessionHint()).toBe(true)
  })
})

describe('logout', () => {
  it('ends the session locally and clears cached server data even when the server call fails', async () => {
    setSessionHint()
    server.use(
      http.post(api('/auth/refresh'), () => envelope({ user: maya, accessToken: 'fresh-token' })),
      http.post(api('/auth/logout'), () => HttpResponse.error())
    )
    const { store, wrapper } = mount()
    await waitFor(() => expect(store.getState().auth.status).toBe('authenticated'))
    const { result } = renderHook(() => useLogoutMutation(), { wrapper })
    await act(async () => {
      await result.current[0]()
        .unwrap()
        .catch(() => undefined)
    })
    expect(store.getState().auth).toEqual({ user: null, status: 'guest' })
    expect(getAccessToken()).toBeNull()
    expect(hasSessionHint()).toBe(false)
    expect(Object.keys(store.getState().api.queries)).toEqual([])
  })
})

describe('an expired session', () => {
  it('ends when a protected call gets 401 and the refresh is rejected', async () => {
    setSessionHint()
    let refreshes = 0
    server.use(
      http.post(api('/auth/refresh'), () => {
        refreshes += 1
        return refreshes === 1
          ? envelope({ user: maya, accessToken: 'short-lived' })
          : rejected('Refresh token reuse detected')
      }),
      http.get(api('/orders/mine'), () => rejected('Token expired'))
    )
    const { store } = mount()
    await waitFor(() => expect(store.getState().auth.status).toBe('authenticated'))
    await expect(request('/orders/mine')).rejects.toMatchObject({ status: 401 })
    expect(store.getState().auth).toEqual({ user: null, status: 'guest' })
    expect(hasSessionHint()).toBe(false)
  })
})
