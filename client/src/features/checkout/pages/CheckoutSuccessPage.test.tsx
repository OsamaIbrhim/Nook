import { render, screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { Provider } from 'react-redux'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { createStore } from '../../../app/store'
import { server } from '../../../test/server'
import { sessionStarted } from '../../auth'
import { CheckoutSuccessPage } from './CheckoutSuccessPage'

const api = (path: string) => `http://localhost:3000/api/v1${path}`
const MUG = 'a1'.repeat(12)
const user = {
  _id: 'a'.repeat(24),
  name: 'Maya',
  email: 'maya@example.test',
  role: 'customer' as const,
  isActive: true,
  createdAt: '2026-11-01T10:00:00.000Z'
}
const orderResponse = (paymentStatus: string) =>
  HttpResponse.json({
    success: true,
    data: { order: { _id: 'c'.repeat(24), code: 'CCCCCCCC', status: 'processing', paymentStatus } }
  })

function renderSuccess(url: string) {
  localStorage.setItem('nook.cart', JSON.stringify({ version: 1, lines: [{ productId: MUG, quantity: 2 }] }))
  const store = createStore()
  store.dispatch(sessionStarted(user))
  const router = createMemoryRouter([{ path: '/checkout/success', element: <CheckoutSuccessPage /> }], {
    initialEntries: [url]
  })
  render(
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>
  )
  return store
}
const storedLines = () => JSON.parse(localStorage.getItem('nook.cart') ?? '{"lines":[]}').lines

describe('CheckoutSuccessPage', () => {
  it('claims nothing and keeps the bag while the payment is unconfirmed', async () => {
    server.use(http.get(api('/orders/by-session/cs_test_1'), () => orderResponse('unpaid')))
    renderSuccess('/checkout/success?session_id=cs_test_1')
    expect(await screen.findByRole('heading', { name: 'Confirming your payment' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Payment received' })).not.toBeInTheDocument()
    expect(storedLines()).toEqual([{ productId: MUG, quantity: 2 }])
  })

  it('says Payment received and empties the bag only after the server reports the order paid', async () => {
    server.use(http.get(api('/orders/by-session/cs_test_1'), () => orderResponse('paid')))
    const store = renderSuccess('/checkout/success?session_id=cs_test_1')
    expect(await screen.findByRole('heading', { name: 'Payment received' })).toBeInTheDocument()
    await waitFor(() => expect(store.getState().cart.lines).toEqual([]))
    expect(storedLines()).toEqual([])
  })

  it('keeps the bag and offers the orders list when the address has no session id', async () => {
    renderSuccess('/checkout/success')
    expect(await screen.findByRole('heading', { name: /couldn.t confirm/i })).toBeInTheDocument()
    expect(storedLines()).toEqual([{ productId: MUG, quantity: 2 }])
    expect(screen.getByRole('link', { name: 'View your orders' })).toHaveAttribute('href', '/orders')
  })

  it('keeps the bag when the session belongs to nobody the customer can see (404)', async () => {
    server.use(
      http.get(api('/orders/by-session/cs_other'), () =>
        HttpResponse.json(
          { success: false, error: { message: 'Order not found', code: 'order_not_found' } },
          { status: 404 }
        )
      )
    )
    renderSuccess('/checkout/success?session_id=cs_other')
    expect(await screen.findByRole('heading', { name: /couldn.t find this order/i })).toBeInTheDocument()
    expect(storedLines()).toEqual([{ productId: MUG, quantity: 2 }])
  })
})
