import { siteName } from './siteUrl'

export const PAGE_KEYS = [
  'home',
  'products',
  'product',
  'cart',
  'checkout',
  'checkout-success',
  'login',
  'register',
  'account',
  'orders',
  'order',
  'admin',
  'not-found'
] as const
export type PageKey = (typeof PAGE_KEYS)[number]

type Robots = 'index' | 'noindex,nofollow' | 'noindex,follow'
type PageEntry = { title: string | null; description: string; robots: Robots }

const HOME_TITLE = `${siteName} | Fewer, better objects for everyday life`
const INDEXED_ROBOTS = 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1'

const PAGES: Record<PageKey, PageEntry> = {
  home: {
    title: null,
    description:
      'Shop a tightly curated collection of useful, distinctive objects for home, kitchen, workspace, and everyday wellness.',
    robots: 'index'
  },
  products: {
    title: 'The collection',
    description:
      'Explore useful, distinctive objects for home, kitchen, workspace, and wellness, selected for honest materials, clear function, and lasting presence.',
    robots: 'index'
  },
  product: { title: 'Product', description: 'A curated object from the Nook collection.', robots: 'index' },
  cart: {
    title: 'Your bag',
    description: 'Review the objects in your bag and see your total before you check out.',
    robots: 'noindex,nofollow'
  },
  checkout: {
    title: 'Checkout',
    description: 'Enter your delivery details and pay securely.',
    robots: 'noindex,nofollow'
  },
  'checkout-success': {
    title: 'Order status',
    description: 'Confirmation of your payment and order status.',
    robots: 'noindex,nofollow'
  },
  login: { title: 'Sign in', description: 'Sign in to track orders and check out faster.', robots: 'noindex,follow' },
  register: {
    title: 'Create account',
    description: 'Create an account to save your details and follow your orders.',
    robots: 'noindex,follow'
  },
  account: { title: 'Account', description: 'Your Nook account details.', robots: 'noindex,nofollow' },
  orders: {
    title: 'Your orders',
    description: 'Follow every order from payment to delivery.',
    robots: 'noindex,nofollow'
  },
  order: { title: 'Order', description: 'Details and status of one of your orders.', robots: 'noindex,nofollow' },
  admin: { title: 'Admin', description: 'Private Nook store administration.', robots: 'noindex,nofollow' },
  'not-found': {
    title: 'Page not found',
    description: 'The page you are looking for does not exist or has moved.',
    robots: 'noindex,nofollow'
  }
}

export type MetadataInput = {
  page: PageKey
  path: string
  title?: string
  description?: string
  image?: string
  category?: string
  categorySlug?: string
  search?: string
  sorted?: boolean
  jsonLd?: Record<string, unknown> | Record<string, unknown>[]
}

export type PageMetadata = {
  title: string
  description: string
  canonical: string
  robots: string
  image: string
  siteName: string
  type: 'website' | 'product'
  jsonLd?: MetadataInput['jsonLd']
}

function titleFor(entry: PageEntry, input: MetadataInput) {
  if (input.page === 'home') return HOME_TITLE
  if (input.page === 'products') {
    if (input.search) return `Search: ${input.search} | ${siteName}`
    if (input.category) return `${input.category} | ${siteName}`
  }
  return `${input.title ?? entry.title} | ${siteName}`
}

export function metadataFor(input: MetadataInput, { siteUrl }: { siteUrl: string }): PageMetadata {
  const entry = PAGES[input.page]
  const narrowed = input.page === 'products' && (Boolean(input.search) || Boolean(input.sorted))
  const robots = narrowed ? 'noindex,follow' : entry.robots
  const path = input.path.startsWith('/') ? input.path : `/${input.path}`
  const query = input.page === 'products' && input.categorySlug && !narrowed ? `?category=${input.categorySlug}` : ''
  return {
    title: titleFor(entry, input),
    description: input.description ?? entry.description,
    canonical: `${siteUrl}${path}${query}`,
    robots: robots === 'index' ? INDEXED_ROBOTS : robots,
    image: input.image ?? `${siteUrl}/og-cover.jpg`,
    siteName,
    type: input.page === 'product' ? 'product' : 'website',
    jsonLd: input.jsonLd
  }
}
