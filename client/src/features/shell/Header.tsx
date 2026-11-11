import { Menu, Search, ShoppingBag, User, X } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useLogoutMutation, useSession } from '../auth'
import { useCartCount } from '../cart'
import { useListCategoriesQuery } from '../catalog'

const navLink =
  'whitespace-nowrap text-eyebrow font-medium uppercase decoration-1 underline-offset-8 hover:underline aria-[current=page]:underline'
const iconButton = 'grid size-11 place-items-center'

export function Header() {
  const menu = useRef<HTMLDialogElement>(null)
  const [search, setSearch] = useState('')
  const { user } = useSession()
  const cartCount = useCartCount()
  const [logout] = useLogoutMutation()
  const { data: categories = [] } = useListCategoriesQuery()
  const navigate = useNavigate()
  const location = useLocation()
  const onListing = location.pathname === '/products'
  const activeCategory = onListing ? new URLSearchParams(location.search).get('category') : null

  useEffect(() => {
    menu.current?.close()
  }, [location.pathname, location.search])

  const submitSearch = (event: FormEvent) => {
    event.preventDefault()
    const value = search.trim()
    navigate(value ? `/products?search=${encodeURIComponent(value)}` : '/products')
    menu.current?.close()
  }

  const bagLabel = cartCount === 1 ? 'Bag, 1 item' : `Bag, ${cartCount} items`

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper">
      <div className="container-app grid h-(--header-h) grid-cols-[1fr_auto_1fr] items-center gap-4">
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => menu.current?.showModal()}
            className={`${iconButton} -ml-3 xl:hidden`}
            aria-label="Open menu"
          >
            <Menu size={20} strokeWidth={1.5} />
          </button>
          <nav aria-label="Primary" className="hidden items-center gap-7 xl:flex">
            <Link to="/products" className={navLink} aria-current={onListing && !activeCategory ? 'page' : undefined}>
              Shop all
            </Link>
            {categories.map((category) => (
              <Link
                key={category.slug}
                to={`/products?category=${category.slug}`}
                className={navLink}
                aria-current={activeCategory === category.slug ? 'page' : undefined}
              >
                {category.name}
              </Link>
            ))}
          </nav>
        </div>

        <Link to="/" className="font-display text-[1.75rem] leading-none" aria-label="Nook Objects, home">
          Nook
        </Link>

        <div className="flex items-center justify-end">
          {user?.role === 'admin' && (
            <Link to="/admin" className={`${navLink} mr-4 hidden xl:block`}>
              Admin
            </Link>
          )}
          <form onSubmit={submitSearch} role="search" className="relative mr-2 hidden w-56 xl:block">
            <Search className="absolute left-0 top-1/2 -translate-y-1/2 text-ink-muted" size={18} strokeWidth={1.5} />
            <input
              type="search"
              aria-label="Search the collection"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full border-b border-line-strong bg-transparent py-2 pl-7 text-sm placeholder:text-ink-subtle focus:border-ink focus:outline-none"
              placeholder="Search"
            />
          </form>
          <Link
            to={user ? '/account' : '/login'}
            className={`${iconButton} hidden xl:grid`}
            aria-label={user ? 'Account' : 'Sign in'}
          >
            <User size={18} strokeWidth={1.5} />
          </Link>
          <Link to="/cart" className={`${iconButton} relative -mr-3`} aria-label={bagLabel}>
            <ShoppingBag size={18} strokeWidth={1.5} />
            {cartCount > 0 && (
              <span
                aria-hidden="true"
                className="absolute right-1 top-1 grid min-w-4.5 place-items-center rounded-full bg-ink px-1 text-[0.6875rem] leading-[1.125rem] text-paper tabular-nums"
              >
                {cartCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      <dialog
        ref={menu}
        aria-label="Menu"
        className="m-0 h-dvh max-h-none w-[min(360px,90vw)] max-w-none bg-paper p-0 text-ink shadow-overlay backdrop:bg-scrim"
        onClick={(event) => event.target === menu.current && menu.current?.close()}
      >
        <div className="flex h-full flex-col px-6 pb-8 pt-4">
          <button
            type="button"
            onClick={() => menu.current?.close()}
            className={`${iconButton} -ml-3`}
            aria-label="Close menu"
          >
            <X size={20} strokeWidth={1.5} />
          </button>
          <form onSubmit={submitSearch} role="search" className="relative mt-4">
            <Search className="absolute left-0 top-1/2 -translate-y-1/2 text-ink-muted" size={18} strokeWidth={1.5} />
            <input
              type="search"
              aria-label="Search the collection"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full border-b border-line-strong bg-transparent py-3 pl-8 text-base placeholder:text-ink-subtle focus:border-ink focus:outline-none"
              placeholder="Search"
            />
          </form>
          <nav aria-label="Categories" className="mt-8 flex flex-col gap-4">
            <Link to="/products" className="font-display text-h3">
              Shop all
            </Link>
            {categories.map((category) => (
              <Link key={category.slug} to={`/products?category=${category.slug}`} className="font-display text-h3">
                {category.name}
              </Link>
            ))}
          </nav>
          <div className="mt-auto flex flex-col items-start gap-4 border-t border-line pt-6 text-sm">
            <Link to="/orders">Orders</Link>
            <Link to={user ? '/account' : '/login'}>{user ? 'Account' : 'Sign in'}</Link>
            {user?.role === 'admin' && <Link to="/admin">Admin</Link>}
            {user && (
              <button type="button" onClick={() => logout()}>
                Sign out
              </button>
            )}
          </div>
        </div>
      </dialog>
    </header>
  )
}
