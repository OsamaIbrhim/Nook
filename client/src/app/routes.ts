import type { PageKey } from '../shared/seo/metadata'

type RouteEntry = { path: string; page: PageKey; sitemap?: boolean }

export const routes: RouteEntry[] = [
  { path: '/', page: 'home', sitemap: true },
  { path: '/products', page: 'products', sitemap: true },
  { path: '/products/:slug', page: 'product' },
  { path: '/cart', page: 'cart' },
  { path: '/login', page: 'login' },
  { path: '/register', page: 'register' },
  { path: '/checkout', page: 'checkout' },
  { path: '/checkout/success', page: 'checkout-success' },
  { path: '/orders', page: 'orders' },
  { path: '/orders/:id', page: 'order' },
  { path: '/account', page: 'account' },
  { path: '/admin', page: 'admin' },
  { path: '/admin/products', page: 'admin' },
  { path: '/admin/orders', page: 'admin' },
  { path: '/admin/users', page: 'admin' },
  { path: '*', page: 'not-found' }
]
