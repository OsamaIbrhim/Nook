import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { Provider } from 'react-redux'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createStore } from '../../../app/store'
import type { Quote, QuoteLine } from '../../../shared/contract/types'
import { server } from '../../../test/server'
import { knownPrices } from '../knownPrices'
import { CartPage } from './CartPage'

const quoteUrl = 'http://localhost:3000/api/v1/cart/quote'
const MUG = 'a1'.repeat(12)
const BOWL = 'c3'.repeat(12)

const line = (overrides: Partial<QuoteLine> = {}): QuoteLine => ({
  productId: MUG,
  slug: 'ripple-mug',
  name: 'Ripple Mug',
  image: null,
  category: { name: 'Home', slug: 'home' },
  unitPrice: 24,
  compareAtPrice: null,
  requestedQuantity: 1,
  quantity: 1,
  maxQuantity: 5,
  lineTotal: 24,
  status: 'ok',
  issue: null,
  ...overrides
})
const quote = (
  lines: QuoteLine[],
  totals: Pick<Quote, 'subtotal' | 'shipping' | 'total'>,
  remaining: number | null
): Quote => ({
  currency: 'egp',
  lines,
  ...totals,
  freeShippingThreshold: 200,
  freeShippingRemaining: remaining,
  checkoutAllowed: lines.some((entry) => entry.quantity > 0)
})
const respondWith = (build: (lines: { productId: string; quantity: number }[]) => Quote | Response) => {
  const requests: { productId: string; quantity: number }[][] = []
  server.use(
    http.post(quoteUrl, async ({ request }) => {
      const { lines } = (await request.json()) as { lines: { productId: string; quantity: number }[] }
      requests.push(lines)
      const answer = build(lines)
      return answer instanceof Response ? answer : HttpResponse.json({ success: true, data: answer })
    })
  )
  return requests
}

const storedLines = () => JSON.parse(localStorage.getItem('nook.cart') ?? '{"lines":[]}').lines
function renderCart(lines: { productId: string; quantity: number }[]) {
  localStorage.setItem('nook.cart', JSON.stringify({ version: 1, lines }))
  const router = createMemoryRouter(
    [
      { path: '/cart', element: <CartPage /> },
      { path: '*', element: <p>elsewhere</p> }
    ],
    {
      initialEntries: ['/cart']
    }
  )
  render(
    <Provider store={createStore()}>
      <RouterProvider router={router} />
    </Provider>
  )
}

beforeEach(() => knownPrices.clear())
afterEach(() => server.resetHandlers())

describe('CartPage totals come from the server quote', () => {
  it('1 mug at 24.00 EGP: subtotal 24.00, shipping 50.00, total 74.00, and 176.00 short of free shipping', async () => {
    respondWith(() => quote([line()], { subtotal: 24, shipping: 50, total: 74 }, 176))
    renderCart([{ productId: MUG, quantity: 1 }])
    expect(await screen.findByText('Add EGP 176.00 more for free shipping.')).toBeInTheDocument()
    const summary = screen.getByRole('complementary')
    expect(summary).toHaveTextContent(/Subtotal\s*EGP.24\.00/)
    expect(summary).toHaveTextContent(/Shipping\s*EGP.50\.00/)
    expect(summary).toHaveTextContent(/Total\s*EGP.74\.00/)
    expect(summary).not.toHaveTextContent('$')
  })

  it('4 mugs at 50.00 EGP reach the 200.00 threshold exactly: shipping is Free, total 200.00, no prompt to add more', async () => {
    respondWith(() =>
      quote(
        [line({ unitPrice: 50, requestedQuantity: 4, quantity: 4, lineTotal: 200 })],
        { subtotal: 200, shipping: 0, total: 200 },
        0
      )
    )
    renderCart([{ productId: MUG, quantity: 4 }])
    const summary = await screen.findByRole('complementary')
    await waitFor(() => expect(summary).toHaveTextContent(/Shipping\s*Free/))
    expect(summary).toHaveTextContent(/Total\s*EGP.200\.00/)
    expect(summary).not.toHaveTextContent(/more for free shipping/)
  })

  it('shows the server answer, not quantity x price: 3 asked, 2 in stock, so 2 x 24.00 = 48.00 and the bag is lowered to 2 with a notice', async () => {
    respondWith((lines) =>
      lines[0].quantity === 3
        ? quote(
            [
              line({
                requestedQuantity: 3,
                quantity: 2,
                maxQuantity: 2,
                lineTotal: 48,
                status: 'adjusted',
                issue: 'stock_reduced'
              })
            ],
            { subtotal: 48, shipping: 50, total: 98 },
            152
          )
        : quote(
            [line({ requestedQuantity: 2, quantity: 2, maxQuantity: 2, lineTotal: 48 })],
            { subtotal: 48, shipping: 50, total: 98 },
            152
          )
    )
    renderCart([{ productId: MUG, quantity: 3 }])
    expect(await screen.findByText('Only 2 of Ripple Mug are available, so we updated your bag.')).toBeInTheDocument()
    await waitFor(() => expect(storedLines()).toEqual([{ productId: MUG, quantity: 2 }]))
    expect(screen.getByRole('complementary')).toHaveTextContent(/Subtotal\s*EGP.48\.00/)
    expect(screen.getByRole('complementary')).toHaveTextContent(/Total\s*EGP.98\.00/)
  })

  it('removes a product that is no longer for sale, says so, and keeps the others', async () => {
    respondWith((lines) =>
      quote(
        lines.map((entry) =>
          entry.productId === BOWL
            ? line({
                productId: BOWL,
                name: 'Stone Bowl',
                slug: 'stone-bowl',
                unitPrice: null,
                requestedQuantity: 1,
                quantity: 0,
                maxQuantity: 0,
                lineTotal: 0,
                status: 'unavailable',
                issue: 'out_of_stock'
              })
            : line()
        ),
        { subtotal: 24, shipping: 50, total: 74 },
        176
      )
    )
    renderCart([
      { productId: MUG, quantity: 1 },
      { productId: BOWL, quantity: 1 }
    ])
    expect(await screen.findByText('Stone Bowl is out of stock and was removed from your bag.')).toBeInTheDocument()
    await waitFor(() => expect(storedLines()).toEqual([{ productId: MUG, quantity: 1 }]))
  })

  it('tells the customer when a price changed since they last saw it: 24.00 became 26.00', async () => {
    knownPrices.set(MUG, 24)
    respondWith(() => quote([line({ unitPrice: 26, lineTotal: 26 })], { subtotal: 26, shipping: 50, total: 76 }, 174))
    renderCart([{ productId: MUG, quantity: 1 }])
    expect(await screen.findByText('The price of Ripple Mug changed from EGP 24.00 to EGP 26.00.')).toBeInTheDocument()
    expect(screen.getByRole('complementary')).toHaveTextContent(/Total\s*EGP.76\.00/)
  })
})

describe('CartPage interaction', () => {
  it('changes the stored quantity at once but asks for a new quote only after the typing pause, once', async () => {
    const requests = respondWith((lines) => {
      const quantity = lines[0].quantity
      return quote(
        [line({ requestedQuantity: quantity, quantity, lineTotal: 24 * quantity })],
        { subtotal: 24 * quantity, shipping: 50, total: 24 * quantity + 50 },
        200 - 24 * quantity
      )
    })
    renderCart([{ productId: MUG, quantity: 1 }])
    await screen.findByText('Ripple Mug')
    await waitFor(() => expect(requests).toHaveLength(1))
    const plus = screen.getByRole('button', { name: 'Increase quantity of Ripple Mug' })
    await userEvent.click(plus)
    await userEvent.click(plus)
    expect(storedLines()).toEqual([{ productId: MUG, quantity: 3 }])
    await waitFor(() => expect(screen.getByRole('complementary')).toHaveTextContent(/Total\s*EGP.122\.00/))
    expect(requests).toHaveLength(2)
    expect(requests[1]).toEqual([{ productId: MUG, quantity: 3 }])
  })

  it('does not offer more than the server allows: plus is disabled at maxQuantity', async () => {
    respondWith(() =>
      quote(
        [line({ requestedQuantity: 2, quantity: 2, maxQuantity: 2, lineTotal: 48 })],
        { subtotal: 48, shipping: 50, total: 98 },
        152
      )
    )
    renderCart([{ productId: MUG, quantity: 2 }])
    await screen.findByText('Ripple Mug')
    expect(screen.getByRole('button', { name: 'Increase quantity of Ripple Mug' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Decrease quantity of Ripple Mug' })).toBeEnabled()
  })

  it('removing the last product shows the empty bag and asks for no further quote', async () => {
    const requests = respondWith(() => quote([line()], { subtotal: 24, shipping: 50, total: 74 }, 176))
    renderCart([{ productId: MUG, quantity: 1 }])
    await screen.findByText('Ripple Mug')
    await userEvent.click(screen.getByRole('button', { name: 'Remove Ripple Mug from your bag' }))
    expect(await screen.findByRole('heading', { name: 'Your bag is empty' })).toBeInTheDocument()
    await new Promise((resolve) => setTimeout(resolve, 400))
    expect(requests).toHaveLength(1)
    expect(storedLines()).toEqual([])
  })

  it('an empty bag never calls the quote endpoint (the server rejects an empty list)', async () => {
    const requests = respondWith(() => quote([], { subtotal: 0, shipping: 0, total: 0 }, null))
    renderCart([])
    expect(await screen.findByRole('heading', { name: 'Your bag is empty' })).toBeInTheDocument()
    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(requests).toHaveLength(0)
  })

  it('shows an error with Try again when prices cannot be fetched', async () => {
    let calls = 0
    respondWith(() =>
      ++calls === 1 ? HttpResponse.error() : quote([line()], { subtotal: 24, shipping: 50, total: 74 }, 176)
    )
    renderCart([{ productId: MUG, quantity: 1 }])
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('The server could not be reached. Please try again.')
    await userEvent.click(screen.getByRole('button', { name: /try again/i }))
    expect(await screen.findByText('Ripple Mug')).toBeInTheDocument()
  })

  it('disables checkout when the server says nothing can be bought', async () => {
    respondWith(() => ({
      ...quote(
        [line({ quantity: 0, status: 'unavailable', issue: 'inactive', unitPrice: null, lineTotal: 0 })],
        { subtotal: 0, shipping: 0, total: 0 },
        200
      ),
      checkoutAllowed: false
    }))
    renderCart([
      { productId: MUG, quantity: 1 },
      { productId: BOWL, quantity: 1 }
    ])
    await waitFor(() => expect(screen.getByRole('button', { name: 'Continue to checkout' })).toBeDisabled())
  })
})
