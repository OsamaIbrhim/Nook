import { act, renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import type { ReactNode } from 'react'
import { Provider } from 'react-redux'
import { describe, expect, it } from 'vitest'
import { createStore } from '../../app/store'
import { server } from '../../test/server'
import { sessionStarted } from '../auth'
import { useOrderConfirmation } from './useOrderConfirmation'

const api = (path: string) => `http://localhost:3000/api/v1${path}`
const user = {
  _id: 'a'.repeat(24),
  name: 'Maya',
  email: 'maya@example.test',
  role: 'customer' as const,
  isActive: true,
  createdAt: '2026-11-01T10:00:00.000Z'
}
const orderBody = (paymentStatus: string) => ({
  success: true,
  data: { order: { _id: 'c'.repeat(24), code: 'CCCCCCCC', status: 'processing', paymentStatus } }
})
const fast = { pollMs: 20, giveUpMs: 700 }

function setup(sessionId: string | null, signedIn = true) {
  const store = createStore()
  if (signedIn) store.dispatch(sessionStarted(user))
  const wrapper = ({ children }: { children: ReactNode }) => <Provider store={store}>{children}</Provider>
  return { store, ...renderHook(() => useOrderConfirmation(sessionId, fast), { wrapper }) }
}

describe('useOrderConfirmation', () => {
  it('reports confirming while the order is unpaid and paid as soon as the server says so', async () => {
    let calls = 0
    server.use(
      http.get(api('/orders/by-session/cs_test_1'), () => HttpResponse.json(orderBody(++calls < 3 ? 'unpaid' : 'paid')))
    )
    const { result } = setup('cs_test_1')
    expect(result.current.state).toBe('confirming')
    await waitFor(() => expect(result.current.state).toBe('paid'))
    expect(calls).toBe(3)
  })

  it('stops polling once paid', async () => {
    let calls = 0
    server.use(
      http.get(api('/orders/by-session/cs_test_1'), () => HttpResponse.json(orderBody(++calls < 2 ? 'unpaid' : 'paid')))
    )
    const { result } = setup('cs_test_1')
    await waitFor(() => expect(result.current.state).toBe('paid'))
    const settled = calls
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100))
    })
    expect(calls).toBe(settled)
  })

  it('gives up with timed-out when the payment is still unconfirmed after the limit', async () => {
    server.use(http.get(api('/orders/by-session/cs_test_1'), () => HttpResponse.json(orderBody('unpaid'))))
    const { result } = setup('cs_test_1')
    await waitFor(() => expect(result.current.state).toBe('timed-out'), { timeout: 1500 })
  })

  it('reports not-found for an unknown session or somebody else order (404)', async () => {
    server.use(
      http.get(api('/orders/by-session/cs_test_1'), () =>
        HttpResponse.json(
          { success: false, error: { message: 'Order not found', code: 'order_not_found' } },
          { status: 404 }
        )
      )
    )
    const { result } = setup('cs_test_1')
    await waitFor(() => expect(result.current.state).toBe('not-found'))
  })

  it('reports missing-session without any request when the address has no session_id', async () => {
    const { result } = setup(null)
    expect(result.current.state).toBe('missing-session')
  })

  it('makes no request until the user is signed in again, then confirms', async () => {
    let calls = 0
    server.use(
      http.get(api('/orders/by-session/cs_test_1'), () => {
        calls += 1
        return HttpResponse.json(orderBody('paid'))
      })
    )
    const { result, store } = setup('cs_test_1', false)
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 60))
    })
    expect(calls).toBe(0)
    expect(result.current.state).toBe('confirming')
    act(() => {
      store.dispatch(sessionStarted(user))
    })
    await waitFor(() => expect(result.current.state).toBe('paid'))
  })
})
