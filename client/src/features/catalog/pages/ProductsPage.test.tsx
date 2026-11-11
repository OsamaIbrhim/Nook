import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { delay, http, HttpResponse } from 'msw'
import { Provider } from 'react-redux'
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { createStore } from '../../../app/store'
import type { Product } from '../../../shared/contract/types'
import { server } from '../../../test/server'
import { ProductsPage } from './ProductsPage'

const api = (path: string) => `http://localhost:3000/api/v1${path}`
const envelope = (data: unknown) => HttpResponse.json({ success: true, data })
const category = (name: string, slug: string) => ({
  _id: slug.padEnd(24, '0'),
  name,
  slug,
  productCount: 1,
  cover: null
})
const product = (name: string, categorySlug: string): Product => ({
  _id: name.toLowerCase().replace(/\W/g, '').padEnd(24, '0').slice(0, 24),
  name,
  slug: name.toLowerCase().replace(/\W+/g, '-'),
  description: `${name} description`,
  price: 24,
  stock: 5,
  category: { _id: categorySlug.padEnd(24, '0'), name: categorySlug, slug: categorySlug },
  images: [],
  isActive: true,
  createdAt: '2026-11-01T10:00:00.000Z',
  updatedAt: '2026-11-01T10:00:00.000Z'
})
const page = (products: Product[]) => ({
  products,
  pagination: { page: 1, limit: 12, total: products.length, pages: 1 }
})

const seen: URLSearchParams[] = []
const catalog = (respond: (params: URLSearchParams) => Response | Promise<Response>) => [
  http.get(api('/categories'), () =>
    envelope({ categories: [category('Home', 'home'), category('Kitchen', 'kitchen')] })
  ),
  http.get(api('/products'), ({ request }) => {
    const params = new URL(request.url).searchParams
    seen.push(params)
    return respond(params)
  })
]

function Url() {
  const { pathname, search } = useLocation()
  return <output aria-label="current url">{pathname + search}</output>
}

function renderListing(url: string) {
  const router = createMemoryRouter(
    [
      {
        path: '/products',
        element: (
          <>
            <ProductsPage />
            <Url />
          </>
        )
      }
    ],
    { initialEntries: [url] }
  )
  render(
    <Provider store={createStore()}>
      <RouterProvider router={router} />
    </Provider>
  )
}

afterEach(() => {
  seen.length = 0
})

describe('ProductsPage', () => {
  it('marks the category from the URL as current: ?category=home highlights Home and asks the API for the home slug', async () => {
    server.use(...catalog(() => envelope(page([product('Ripple Mug', 'home')]))))
    renderListing('/products?category=home')
    expect(await screen.findByRole('link', { name: /Ripple Mug/ })).toBeInTheDocument()
    const categories = screen.getByRole('navigation', { name: 'Categories' })
    expect(await within(categories).findByRole('link', { name: 'Home' })).toHaveAttribute('aria-current', 'page')
    expect(within(categories).getByRole('link', { name: 'Kitchen' })).not.toHaveAttribute('aria-current')
    expect(screen.getByRole('heading', { level: 1, name: 'Home' })).toBeInTheDocument()
    expect(seen[0].get('category')).toBe('home')
  })

  it('choosing another category writes its slug to the URL and requests it, starting again from page 1', async () => {
    server.use(...catalog(() => envelope(page([product('Ripple Mug', 'home')]))))
    renderListing('/products?category=home&page=3')
    await screen.findByRole('link', { name: /Ripple Mug/ })
    const categories = screen.getByRole('navigation', { name: 'Categories' })
    await userEvent.click(await within(categories).findByRole('link', { name: 'Kitchen' }))
    await waitFor(() => expect(screen.getByLabelText('current url')).toHaveTextContent('/products?category=kitchen'))
    await waitFor(() => expect(seen.at(-1)?.get('category')).toBe('kitchen'))
    expect(seen.at(-1)?.has('page')).toBe(false)
  })

  it('keeps the previous results on screen, marked busy, while a changed filter loads: no skeleton flash', async () => {
    server.use(
      ...catalog(async (params) => {
        if (params.get('sort') === 'name') await delay(150)
        return envelope(page([product(params.get('sort') === 'name' ? 'Alphabetical Mug' : 'Ripple Mug', 'home')]))
      })
    )
    renderListing('/products')
    await screen.findByRole('link', { name: /Ripple Mug/ })
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Sort' }), 'Name A to Z')
    const grid = screen.getByRole('link', { name: /Ripple Mug/ }).closest('[aria-busy]') as HTMLElement
    await waitFor(() => expect(grid).toHaveAttribute('aria-busy', 'true'))
    expect(screen.queryByLabelText('Loading products')).not.toBeInTheDocument()
    expect(await screen.findByRole('link', { name: /Alphabetical Mug/ })).toBeInTheDocument()
  })

  it('shows a skeleton only for the very first load', async () => {
    server.use(...catalog(() => envelope(page([product('Ripple Mug', 'home')]))))
    renderListing('/products')
    expect(screen.getByLabelText('Loading products')).toBeInTheDocument()
    await screen.findByRole('link', { name: /Ripple Mug/ })
  })

  it('shows an error with Try again, and recovers when the request succeeds the second time', async () => {
    let calls = 0
    server.use(
      ...catalog(() => (++calls === 1 ? HttpResponse.error() : envelope(page([product('Ripple Mug', 'home')]))))
    )
    renderListing('/products')
    const alert = await screen.findByRole('alert')
    expect(within(alert).getByText('The server could not be reached. Please try again.')).toBeInTheDocument()
    await userEvent.click(within(alert).getByRole('button', { name: /try again/i }))
    expect(await screen.findByRole('link', { name: /Ripple Mug/ })).toBeInTheDocument()
  })

  it('searches after the typing pause, as a trimmed search parameter, and back at page 1', async () => {
    server.use(...catalog(() => envelope(page([product('Ripple Mug', 'home')]))))
    renderListing('/products?page=2')
    await screen.findByRole('link', { name: /Ripple Mug/ })
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search the collection' }), '  mu ')
    await waitFor(() => expect(screen.getByLabelText('current url')).toHaveTextContent('/products?search=mu'), {
      timeout: 2000
    })
    expect(screen.getByLabelText('current url')).not.toHaveTextContent('page=')
    await waitFor(() => expect(seen.at(-1)?.get('search')).toBe('mu'))
  })

  it('says what did not match and offers to clear the filters, which returns to the full collection', async () => {
    server.use(...catalog((params) => envelope(page(params.get('search') ? [] : [product('Ripple Mug', 'home')]))))
    renderListing('/products?search=zzz&category=home')
    expect(await screen.findByRole('heading', { name: 'Nothing matches “zzz”.' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('link', { name: 'Clear filters' }))
    expect(await screen.findByRole('link', { name: /Ripple Mug/ })).toBeInTheDocument()
    expect(screen.getByLabelText('current url')).toHaveTextContent(/^\/products$/)
  })

  it('announces how many objects match: 1 object in Home, 2 objects in the whole collection', async () => {
    const mug = product('Ripple Mug', 'home')
    server.use(
      ...catalog((params) => envelope(page(params.get('category') ? [mug] : [mug, product('Oak Tray', 'kitchen')])))
    )
    renderListing('/products?category=home')
    expect(await screen.findByText('1 object')).toHaveAttribute('role', 'status')
    const categories = screen.getByRole('navigation', { name: 'Categories' })
    await userEvent.click(await within(categories).findByRole('link', { name: 'All' }))
    expect(await screen.findByText('2 objects')).toBeInTheDocument()
  })
})
