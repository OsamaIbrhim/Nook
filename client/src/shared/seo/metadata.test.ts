import { describe, expect, it } from 'vitest'
import { metadataFor, PAGE_KEYS } from './metadata'

const SITE = 'https://shop.example.test'
const context = { siteUrl: SITE }
const INDEXED = 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1'

describe('metadataFor', () => {
  it('gives every page key a title, a description and a robots rule', () => {
    for (const page of PAGE_KEYS) {
      const meta = metadataFor({ page, path: '/x' }, context)
      expect(meta.title, page).not.toBe('')
      expect(meta.description.length, page).toBeGreaterThan(20)
      expect(meta.robots, page).toMatch(/^(index|noindex)/)
    }
  })

  it('titles each page from the table: Your bag | Nook Objects', () => {
    const title = (page: (typeof PAGE_KEYS)[number]) => metadataFor({ page, path: '/x' }, context).title
    expect(title('cart')).toBe('Your bag | Nook Objects')
    expect(title('checkout')).toBe('Checkout | Nook Objects')
    expect(title('checkout-success')).toBe('Order status | Nook Objects')
    expect(title('login')).toBe('Sign in | Nook Objects')
    expect(title('register')).toBe('Create account | Nook Objects')
    expect(title('account')).toBe('Account | Nook Objects')
    expect(title('orders')).toBe('Your orders | Nook Objects')
    expect(title('admin')).toBe('Admin | Nook Objects')
    expect(title('not-found')).toBe('Page not found | Nook Objects')
  })

  it('never shows the old "Customer Area" title anywhere', () => {
    for (const page of PAGE_KEYS) {
      expect(metadataFor({ page, path: '/x' }, context).title).not.toContain('Customer Area')
    }
  })

  it('titles the home page without repeating the brand', () => {
    expect(metadataFor({ page: 'home', path: '/' }, context).title).toBe(
      'Nook Objects | Fewer, better objects for everyday life'
    )
  })

  it('keeps private pages out of search results: cart, checkout, orders, account, admin, 404 are noindex', () => {
    for (const page of [
      'cart',
      'checkout',
      'checkout-success',
      'orders',
      'order',
      'account',
      'admin',
      'not-found'
    ] as const) {
      expect(metadataFor({ page, path: '/x' }, context).robots, page).toMatch(/^noindex/)
    }
  })

  it('lets sign-in pages pass link equity but stay out of the index: noindex,follow', () => {
    expect(metadataFor({ page: 'login', path: '/login' }, context).robots).toBe('noindex,follow')
    expect(metadataFor({ page: 'cart', path: '/cart' }, context).robots).toBe('noindex,nofollow')
  })

  it('indexes the home page, the listing and a product with the rich-snippet allowances', () => {
    for (const page of ['home', 'products', 'product'] as const) {
      expect(metadataFor({ page, path: '/x' }, context).robots, page).toBe(INDEXED)
    }
  })

  it('builds the canonical URL from the site URL and the path, adding a missing slash', () => {
    expect(metadataFor({ page: 'cart', path: '/cart' }, context).canonical).toBe(`${SITE}/cart`)
    expect(metadataFor({ page: 'cart', path: 'cart' }, context).canonical).toBe(`${SITE}/cart`)
  })

  it('titles a category listing after the category and a search after the term', () => {
    expect(metadataFor({ page: 'products', path: '/products', category: 'Kitchen' }, context).title).toBe(
      'Kitchen | Nook Objects'
    )
    expect(metadataFor({ page: 'products', path: '/products', search: 'mug' }, context).title).toBe(
      'Search: mug | Nook Objects'
    )
    expect(metadataFor({ page: 'products', path: '/products' }, context).title).toBe('The collection | Nook Objects')
  })

  it('indexes a category listing but not a search or sorted variant, and the canonical drops sort and search', () => {
    const category = metadataFor(
      { page: 'products', path: '/products', category: 'Kitchen', categorySlug: 'kitchen' },
      context
    )
    expect(category.robots).toBe(INDEXED)
    expect(category.canonical).toBe(`${SITE}/products?category=kitchen`)
    const search = metadataFor({ page: 'products', path: '/products', search: 'mug' }, context)
    expect(search.robots).toBe('noindex,follow')
    expect(search.canonical).toBe(`${SITE}/products`)
    const sorted = metadataFor({ page: 'products', path: '/products', sorted: true }, context)
    expect(sorted.robots).toBe('noindex,follow')
    expect(sorted.canonical).toBe(`${SITE}/products`)
  })

  it('titles a product after the title it is given and a private order after its code', () => {
    expect(
      metadataFor(
        { page: 'product', path: '/products/mug', title: 'Ripple Ceramic Mug', description: 'A mug.' },
        context
      ).title
    ).toBe('Ripple Ceramic Mug | Nook Objects')
    expect(metadataFor({ page: 'order', path: '/orders/1', title: 'Order 1A2B3C4D' }, context).title).toBe(
      'Order 1A2B3C4D | Nook Objects'
    )
  })

  it('uses a page description when given, else the table description', () => {
    expect(
      metadataFor({ page: 'product', path: '/p', title: 'Mug', description: 'Hand-finished stoneware mug.' }, context)
        .description
    ).toBe('Hand-finished stoneware mug.')
    expect(metadataFor({ page: 'cart', path: '/cart' }, context).description).toContain('bag')
  })

  it('shares the image and the site name with link previews, falling back to the cover image', () => {
    const fallback = metadataFor({ page: 'home', path: '/' }, context)
    expect(fallback.image).toBe(`${SITE}/og-cover.jpg`)
    expect(fallback.siteName).toBe('Nook Objects')
    expect(
      metadataFor({ page: 'product', path: '/p', title: 'Mug', image: 'https://cdn.example.test/mug.jpg' }, context)
        .image
    ).toBe('https://cdn.example.test/mug.jpg')
  })

  it('declares the product type for a product page and website for the rest', () => {
    expect(metadataFor({ page: 'product', path: '/p', title: 'Mug' }, context).type).toBe('product')
    expect(metadataFor({ page: 'cart', path: '/cart' }, context).type).toBe('website')
  })
})
