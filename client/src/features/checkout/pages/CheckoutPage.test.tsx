import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { Provider } from 'react-redux'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { toast } from 'sonner'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createStore } from '../../../app/store'
import type { Quote, QuoteLine } from '../../../shared/contract/types'
import { redirectTo } from '../../../shared/http/redirect'
import { server } from '../../../test/server'
import { forgetKnownPrices } from '../../cart'
import { clearAttempt } from '../checkoutAttempt'
import { CheckoutPage } from './CheckoutPage'

vi.mock('../../../shared/http/redirect', () => ({ redirectTo: vi.fn() }))

const api = (path: string) => `http://localhost:3000/api/v1${path}`
const MUG = 'a1'.repeat(12)
const LAMP = 'b2'.repeat(12)
const envelope = (data: unknown, status = 200) => HttpResponse.json({ success: true, data }, { status })
const failure = (status: number, code: string, message: string) =>
  HttpResponse.json({ success: false, error: { message, code } }, { status })

const line = (productId: string, name: string, quantity: number, unitPrice: number): QuoteLine => ({
  productId,
  slug: name.toLowerCase().replace(/\W+/g, '-'),
  name,
  image: null,
  category: { name: 'Home', slug: 'home' },
  unitPrice,
  compareAtPrice: null,
  requestedQuantity: quantity,
  quantity,
  maxQuantity: 10,
  lineTotal: unitPrice * quantity,
  status: 'ok',
  issue: null
})
const quote = (overrides: Partial<Quote> = {}): Quote => ({
  currency: 'egp',
  lines: [line(MUG, 'Ripple Mug', 2, 24), line(LAMP, 'Arc Lamp', 1, 99.5)],
  subtotal: 147.5,
  shipping: 50,
  total: 197.5,
  freeShippingThreshold: 200,
  freeShippingRemaining: 52.5,
  checkoutAllowed: true,
  ...overrides
})
const order = (id = 'c'.repeat(24)) => ({
  _id: id,
  code: 'CCCCCCCC',
  actions: { canPay: true, canCancel: true, nextStatuses: [] }
})

const orderRequests: { key: string | null; body: unknown }[] = []
const handlers = (
  options: { quote?: Quote; createOrder?: () => Response | Promise<Response>; session?: () => Response } = {}
) => [
  http.post(api('/cart/quote'), () => envelope(options.quote ?? quote())),
  http.post(api('/orders'), async ({ request }) => {
    orderRequests.push({ key: request.headers.get('idempotency-key'), body: await request.json() })
    return options.createOrder ? options.createOrder() : envelope({ order: order() }, 201)
  }),
  http.post(
    api('/payments/checkout-session'),
    () =>
      options.session?.() ?? envelope({ sessionId: 'cs_test_1', url: 'https://checkout.stripe.test/cs_test_1' }, 201)
  )
]

function renderCheckout() {
  localStorage.setItem(
    'nook.cart',
    JSON.stringify({
      version: 1,
      lines: [
        { productId: MUG, quantity: 2 },
        { productId: LAMP, quantity: 1 }
      ]
    })
  )
  const router = createMemoryRouter(
    [
      { path: '/checkout', element: <CheckoutPage /> },
      { path: '/cart', element: <p>cart page</p> }
    ],
    { initialEntries: ['/checkout'] }
  )
  render(
    <Provider store={createStore()}>
      <RouterProvider router={router} />
    </Provider>
  )
}

const fill = async (overrides: Partial<Record<string, string>> = {}) => {
  const values = {
    'Full name': 'Maya Hassan',
    Address: '12 Garden Street',
    City: 'Cairo',
    'Postal code': '11511',
    ...overrides
  }
  for (const [label, value] of Object.entries(values)) {
    const input = screen.getByLabelText(label)
    await userEvent.clear(input)
    await userEvent.type(input, value)
  }
}
const payButton = () => screen.getByRole('button', { name: /pay securely/i })

beforeEach(() => {
  forgetKnownPrices()
  clearAttempt()
  orderRequests.length = 0
  vi.mocked(redirectTo).mockClear()
})
afterEach(() => vi.restoreAllMocks())

describe('CheckoutPage', () => {
  it('shows what the server quoted: 2 x 24.00 + 1 x 99.50 = 147.50, plus 50.00 shipping = 197.50 EGP', async () => {
    server.use(...handlers())
    renderCheckout()
    const summary = await screen.findByRole('complementary')
    await waitFor(() => expect(within(summary).getByText('Ripple Mug')).toBeInTheDocument())
    expect(within(summary).getByText('Arc Lamp')).toBeInTheDocument()
    expect(within(summary).getByText(/EGP.147\.50/, { selector: 'span' })).toBeInTheDocument()
    expect(within(summary).getByText(/EGP.50\.00/)).toBeInTheDocument()
    expect(within(summary).getByText(/EGP.197\.50/)).toBeInTheDocument()
    expect(summary).not.toHaveTextContent('$')
  })

  it('shows free shipping and the server total when the server says shipping is 0', async () => {
    server.use(...handlers({ quote: quote({ subtotal: 248, shipping: 0, total: 248, freeShippingRemaining: 0 }) }))
    renderCheckout()
    const summary = await screen.findByRole('complementary')
    await waitFor(() => expect(within(summary).getByText('Free')).toBeInTheDocument())
    expect(within(summary).getByText('Total').parentElement).toHaveTextContent(/EGP.248.00/)
  })

  it('creates the order with an Idempotency-Key and the cart lines, then opens the payment page', async () => {
    server.use(...handlers())
    renderCheckout()
    await waitFor(() => expect(payButton()).toBeEnabled())
    await fill()
    await userEvent.click(payButton())
    await waitFor(() => expect(redirectTo).toHaveBeenCalledWith('https://checkout.stripe.test/cs_test_1'))
    expect(orderRequests).toHaveLength(1)
    expect(orderRequests[0].key).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
    expect(orderRequests[0].body).toMatchObject({
      items: [
        { product: MUG, quantity: 2 },
        { product: LAMP, quantity: 1 }
      ],
      shippingAddress: {
        name: 'Maya Hassan',
        line1: '12 Garden Street',
        city: 'Cairo',
        postalCode: '11511',
        country: 'EG'
      }
    })
  })

  it('retries with the SAME key after a failed payment-session call, so no second order is created', async () => {
    let sessionCalls = 0
    server.use(
      ...handlers({
        session: () =>
          ++sessionCalls === 1
            ? failure(502, 'payment_unavailable', 'Payments are unavailable')
            : envelope({ sessionId: 'cs_test_1', url: 'https://checkout.stripe.test/cs_test_1' }, 201)
      })
    )
    const error = vi.spyOn(toast, 'error')
    renderCheckout()
    await waitFor(() => expect(payButton()).toBeEnabled())
    await fill()
    await userEvent.click(payButton())
    await waitFor(() => expect(error).toHaveBeenCalledWith('Payments are unavailable'))
    await waitFor(() => expect(payButton()).toBeEnabled())
    await userEvent.click(payButton())
    await waitFor(() => expect(redirectTo).toHaveBeenCalled())
    expect(orderRequests).toHaveLength(2)
    expect(orderRequests[1].key).toBe(orderRequests[0].key)
  })

  it('uses a NEW key when the address was corrected between attempts, because the server rejects one key with two bodies', async () => {
    let sessionCalls = 0
    server.use(
      ...handlers({
        session: () =>
          ++sessionCalls === 1
            ? failure(502, 'payment_unavailable', 'Payments are unavailable')
            : envelope({ sessionId: 'cs_test_1', url: 'https://checkout.stripe.test/cs_test_1' }, 201)
      })
    )
    renderCheckout()
    await waitFor(() => expect(payButton()).toBeEnabled())
    await fill()
    await userEvent.click(payButton())
    await waitFor(() => expect(sessionCalls).toBe(1))
    await waitFor(() => expect(payButton()).toBeEnabled())
    await fill({ City: 'Giza' })
    await userEvent.click(payButton())
    await waitFor(() => expect(redirectTo).toHaveBeenCalled())
    expect(orderRequests[1].key).not.toBe(orderRequests[0].key)
  })

  it('shows the server message when stock ran out and stays on the page', async () => {
    server.use(
      ...handlers({ createOrder: () => failure(409, 'insufficient_stock', 'Not enough stock for Ripple Mug') })
    )
    const error = vi.spyOn(toast, 'error')
    renderCheckout()
    await waitFor(() => expect(payButton()).toBeEnabled())
    await fill()
    await userEvent.click(payButton())
    await waitFor(() => expect(error).toHaveBeenCalledWith('Not enough stock for Ripple Mug'))
    expect(redirectTo).not.toHaveBeenCalled()
    await waitFor(() => expect(payButton()).toBeEnabled())
  })

  it('does not let the customer pay while the server says nothing in the bag can be bought', async () => {
    server.use(...handlers({ quote: quote({ checkoutAllowed: false }) }))
    renderCheckout()
    await screen.findByRole('complementary')
    await waitFor(() => expect(screen.getByText('Ripple Mug')).toBeInTheDocument())
    expect(payButton()).toBeDisabled()
  })

  it('sends an empty bag back to the cart page', async () => {
    const router = createMemoryRouter(
      [
        { path: '/checkout', element: <CheckoutPage /> },
        { path: '/cart', element: <p>cart page</p> }
      ],
      { initialEntries: ['/checkout'] }
    )
    render(
      <Provider store={createStore()}>
        <RouterProvider router={router} />
      </Provider>
    )
    expect(await screen.findByText('cart page')).toBeInTheDocument()
  })
})
