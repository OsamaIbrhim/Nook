import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { server } from '../../test/server'
import { configureHttp, request } from './client'
import { errorMessage } from './errors'

const url = (path: string) => `http://localhost:3000/api/v1${path}`
const envelope = (data: unknown) => HttpResponse.json({ success: true, data })
const unauthorized = () =>
  HttpResponse.json({ success: false, error: { message: 'Expired', code: 'unauthorized' } }, { status: 401 })

afterEach(() => configureHttp({ getToken: () => null, refreshSession: async () => null }))

describe('request', () => {
  it('returns the data member of the success envelope', async () => {
    server.use(http.get(url('/orders'), () => envelope({ orders: [1, 2] })))
    expect(await request('/orders')).toEqual({ orders: [1, 2] })
  })

  it('returns undefined for 204, the guest refresh answer', async () => {
    server.use(http.post(url('/auth/refresh'), () => new HttpResponse(null, { status: 204 })))
    expect(await request('/auth/refresh', { method: 'POST', auth: false })).toBeUndefined()
  })

  it('sends the in-memory token as a Bearer header and no header for a guest', async () => {
    const seen: (string | null)[] = []
    server.use(
      http.get(url('/orders'), ({ request: req }) => {
        seen.push(req.headers.get('authorization'))
        return envelope({})
      })
    )
    await request('/orders')
    configureHttp({ getToken: () => 'token-123' })
    await request('/orders')
    expect(seen).toEqual([null, 'Bearer token-123'])
  })

  it('omits the token when the call opts out of auth', async () => {
    let seen: string | null = 'unset'
    configureHttp({ getToken: () => 'token-123' })
    server.use(
      http.post(url('/auth/login'), ({ request: req }) => {
        seen = req.headers.get('authorization')
        return envelope({})
      })
    )
    await request('/auth/login', { method: 'POST', auth: false, body: {} })
    expect(seen).toBeNull()
  })

  it('sends JSON bodies and query parameters, skipping undefined ones', async () => {
    let seen = { type: '', query: '', body: null as unknown }
    server.use(
      http.post(url('/cart/quote'), async ({ request: req }) => {
        seen = {
          type: req.headers.get('content-type') ?? '',
          query: new URL(req.url).search,
          body: await req.json()
        }
        return envelope({})
      })
    )
    await request('/cart/quote', {
      method: 'POST',
      body: { lines: [] },
      params: { page: 2, search: undefined, sort: 'name' }
    })
    expect(seen).toEqual({
      type: 'application/json',
      query: '?page=2&sort=name',
      body: { lines: [] }
    })
  })

  it('asks the browser to send the cross-site refresh cookie', async () => {
    server.use(http.get(url('/orders'), () => envelope({})))
    const spy = vi.spyOn(globalThis, 'fetch')
    await request('/orders')
    expect(spy.mock.calls[0][1]).toMatchObject({ credentials: 'include' })
  })

  it('sends extra headers such as Idempotency-Key', async () => {
    let seen: string | null = null
    server.use(
      http.post(url('/orders'), ({ request: req }) => {
        seen = req.headers.get('idempotency-key')
        return envelope({})
      })
    )
    await request('/orders', { method: 'POST', body: {}, headers: { 'Idempotency-Key': 'abc' } })
    expect(seen).toBe('abc')
  })

  it('sends FormData untouched so the browser sets the multipart boundary', async () => {
    let type: string | null = null
    server.use(
      http.post(url('/products'), ({ request: req }) => {
        type = req.headers.get('content-type')
        return envelope({})
      })
    )
    const body = new FormData()
    body.append('name', 'Mug')
    await request('/products', { method: 'POST', body })
    expect(type).toMatch(/^multipart\/form-data; boundary=/)
  })
})

describe('failures', () => {
  const failure = (promise: Promise<unknown>) => promise.catch((error: unknown) => error)

  it('throws status, stable code, message and field errors from the error envelope', async () => {
    server.use(
      http.post(url('/cart/quote'), () =>
        HttpResponse.json(
          {
            success: false,
            error: {
              message: 'Invalid cart',
              code: 'validation_failed',
              fieldErrors: [{ field: 'lines', message: 'must contain between 1 and 50 lines' }]
            }
          },
          { status: 400 }
        )
      )
    )
    expect(await failure(request('/cart/quote', { method: 'POST', body: {} }))).toMatchObject({
      status: 400,
      code: 'validation_failed',
      message: 'Invalid cart',
      fieldErrors: [{ field: 'lines', message: 'must contain between 1 and 50 lines' }]
    })
  })

  it('falls back to a generic message and code when the body is not an error envelope', async () => {
    server.use(http.get(url('/orders'), () => new HttpResponse('Bad gateway', { status: 502 })))
    expect(await failure(request('/orders'))).toMatchObject({
      status: 502,
      code: 'http_error',
      message: 'Request failed (502)'
    })
  })

  it('reports a transport failure as network_error with status 0', async () => {
    server.use(http.get(url('/orders'), () => HttpResponse.error()))
    expect(await failure(request('/orders'))).toMatchObject({ status: 0, code: 'network_error' })
  })

  it('reports a request that exceeds the timeout as timeout', async () => {
    vi.spyOn(AbortSignal, 'timeout').mockReturnValue(AbortSignal.abort())
    server.use(http.get(url('/orders'), () => envelope({})))
    expect(await failure(request('/orders'))).toMatchObject({ status: 0, code: 'timeout' })
  })

  it('lets a caller cancel a request: the abort is passed on, not turned into a network error', async () => {
    const controller = new AbortController()
    controller.abort()
    server.use(http.get(url('/orders'), () => envelope({})))
    expect(await failure(request('/orders', { signal: controller.signal }))).toMatchObject({ name: 'AbortError' })
  })
})

describe('reauthentication', () => {
  const protectedRoute = (seen: (string | null)[]) =>
    http.get(url('/orders/mine'), ({ request: req }) => {
      const header = req.headers.get('authorization')
      seen.push(header)
      return header === 'Bearer fresh' ? envelope({ orders: [] }) : unauthorized()
    })

  it('refreshes once on 401 and repeats the call with the new token', async () => {
    const seen: (string | null)[] = []
    let token: string | null = 'stale'
    const refreshSession = vi.fn(async () => {
      token = 'fresh'
      return token
    })
    configureHttp({ getToken: () => token, refreshSession })
    server.use(protectedRoute(seen))
    expect(await request('/orders/mine')).toEqual({ orders: [] })
    expect(seen).toEqual(['Bearer stale', 'Bearer fresh'])
    expect(refreshSession).toHaveBeenCalledTimes(1)
  })

  it('shares one refresh between two parallel calls that both got 401', async () => {
    let token: string | null = 'stale'
    const refreshSession = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20))
      token = 'fresh'
      return token
    })
    configureHttp({ getToken: () => token, refreshSession })
    server.use(protectedRoute([]))
    const results = await Promise.all([request('/orders/mine'), request('/orders/mine')])
    expect(results).toEqual([{ orders: [] }, { orders: [] }])
    expect(refreshSession).toHaveBeenCalledTimes(1)
  })

  it('does not refresh again when the token already changed after this call was sent', async () => {
    let token: string | null = 'stale'
    const refreshSession = vi.fn(async () => 'unused')
    configureHttp({ getToken: () => token, refreshSession })
    server.use(
      http.get(url('/orders/mine'), ({ request: req }) => {
        if (req.headers.get('authorization') === 'Bearer fresh') return envelope({ orders: [] })
        token = 'fresh'
        return unauthorized()
      })
    )
    expect(await request('/orders/mine')).toEqual({ orders: [] })
    expect(refreshSession).not.toHaveBeenCalled()
  })

  it('fails with the 401 when the refresh gives no token', async () => {
    configureHttp({ getToken: () => 'stale', refreshSession: async () => null })
    server.use(protectedRoute([]))
    await expect(request('/orders/mine')).rejects.toMatchObject({ status: 401, code: 'unauthorized' })
  })

  it('never refreshes for a guest: a 401 without a token is returned as is', async () => {
    const refreshSession = vi.fn(async () => 'fresh')
    configureHttp({ getToken: () => null, refreshSession })
    server.use(protectedRoute([]))
    await expect(request('/orders/mine')).rejects.toMatchObject({ status: 401 })
    expect(refreshSession).not.toHaveBeenCalled()
  })

  it('never refreshes a call that opted out of auth, such as login with a wrong password', async () => {
    const refreshSession = vi.fn(async () => 'fresh')
    configureHttp({ getToken: () => 'stale', refreshSession })
    server.use(http.post(url('/auth/login'), unauthorized))
    await expect(request('/auth/login', { method: 'POST', auth: false, body: {} })).rejects.toMatchObject({
      status: 401
    })
    expect(refreshSession).not.toHaveBeenCalled()
  })
})

describe('errorMessage', () => {
  it('returns the server message of an API failure', () => {
    expect(errorMessage({ status: 404, code: 'order_not_found', message: 'Order not found' })).toBe('Order not found')
  })

  it('says the server could not be reached when there was no response and the browser is online', () => {
    expect(errorMessage({ status: 0, code: 'network_error', message: 'x' })).toBe(
      'The server could not be reached. Please try again.'
    )
  })

  it('says the user appears offline when there was no response and the browser is offline', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    expect(errorMessage({ status: 0, code: 'network_error', message: 'x' })).toBe('You appear to be offline.')
  })

  it('says the server took too long on a timeout', () => {
    expect(errorMessage({ status: 0, code: 'timeout', message: 'x' })).toBe(
      'The server took too long to respond. Please try again.'
    )
  })

  it('passes strings and Error messages through and hides anything else', () => {
    expect(errorMessage('Already a string')).toBe('Already a string')
    expect(errorMessage(new Error('Plain error'))).toBe('Plain error')
    expect(errorMessage({ unexpected: true })).toBe('Something went wrong')
  })
})
