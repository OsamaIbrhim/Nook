import { Link } from 'react-router-dom'
import { useSession } from '../auth'
import { useListCategoriesQuery } from '../catalog'
import { usePolicy } from '../policy'

const heading = 'text-eyebrow font-medium uppercase text-on-inverse-muted'
const list = 'mt-4 flex flex-col items-start gap-3 text-sm'

export function Footer() {
  const { data: categories = [] } = useListCategoriesQuery()
  const policy = usePolicy()
  const { user } = useSession()
  return (
    <footer className="surface-inverse pt-(--section-gap)">
      <div className="container-app">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p className="font-display text-[2.5rem] leading-none">Nook</p>
            <p className="mt-5 max-w-sm text-on-inverse-muted">
              A small collection of useful things, chosen for their materials and made to last.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-6 lg:col-start-7">
            <nav aria-label="Shop">
              <p className={heading}>Shop</p>
              <div className={list}>
                <Link to="/products">Shop all</Link>
                {categories.map((category) => (
                  <Link key={category.slug} to={`/products?category=${category.slug}`}>
                    {category.name}
                  </Link>
                ))}
              </div>
            </nav>
            <nav aria-label="Help">
              <p className={heading}>Help</p>
              <div className={list}>
                <Link to="/orders">Orders</Link>
                {policy && <a href={`mailto:${policy.supportEmail}`}>Contact</a>}
              </div>
            </nav>
            <nav aria-label="Account">
              <p className={heading}>Account</p>
              <div className={list}>
                <Link to={user ? '/account' : '/login'}>{user ? 'Account' : 'Sign in'}</Link>
                <Link to="/cart">Bag</Link>
              </div>
            </nav>
          </div>
        </div>
        <div className="mt-16 flex flex-wrap justify-between gap-3 border-t border-line-inverse py-6 text-caption text-on-inverse-muted">
          <p>© {new Date().getFullYear()} Nook Objects</p>
          <p>Payments by Stripe</p>
        </div>
      </div>
    </footer>
  )
}
