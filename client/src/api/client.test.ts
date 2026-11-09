import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { server } from '../test/server'
import { api, errorMessage } from './client'

const orders = `${api.defaults.baseURL}/orders`

describe('errorMessage', () => {
  it('returns the message the API put in its error envelope', async () => {
    server.use(http.get(orders, () => HttpResponse.json({ success: false, error: { message: 'Order not found' } }, { status: 404 })))
    const error = await api.get('/orders').catch((e: unknown) => e)
    expect(errorMessage(error)).toBe('Order not found')
  })

  it('falls back to the transport message when the body has no error envelope', async () => {
    server.use(http.get(orders, () => new HttpResponse('Bad gateway', { status: 502 })))
    const error = await api.get('/orders').catch((e: unknown) => e)
    expect(errorMessage(error)).toBe('Request failed with status code 502')
  })

  it('says the server could not be reached when there is no response and the browser is online', async () => {
    server.use(http.get(orders, () => HttpResponse.error()))
    const error = await api.get('/orders').catch((e: unknown) => e)
    expect(errorMessage(error)).toBe('The server could not be reached. Please try again.')
  })

  it('says the user appears offline when there is no response and the browser is offline', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    server.use(http.get(orders, () => HttpResponse.error()))
    const error = await api.get('/orders').catch((e: unknown) => e)
    expect(errorMessage(error)).toBe('You appear to be offline.')
  })

  it('passes strings and Error messages through and hides anything else', () => {
    expect(errorMessage('Already a string')).toBe('Already a string')
    expect(errorMessage(new Error('Plain error'))).toBe('Plain error')
    expect(errorMessage({ unexpected: true })).toBe('Something went wrong')
  })
})

describe('api request interceptor', () => {
  it('sends the stored access token as a Bearer header', async () => {
    sessionStorage.setItem('accessToken', 'token-123')
    let seen: string | null = null
    server.use(http.get(orders, ({ request }) => { seen = request.headers.get('authorization'); return HttpResponse.json({ success: true, data: {} }) }))
    await api.get('/orders')
    expect(seen).toBe('Bearer token-123')
  })

  it('sends no Authorization header for a guest', async () => {
    let seen: string | null = 'unset'
    server.use(http.get(orders, ({ request }) => { seen = request.headers.get('authorization'); return HttpResponse.json({ success: true, data: {} }) }))
    await api.get('/orders')
    expect(seen).toBeNull()
  })
})
