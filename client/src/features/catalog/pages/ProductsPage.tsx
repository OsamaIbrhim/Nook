import { Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { errorMessage } from '../../../shared/http/errors'
import { Seo } from '../../../shared/seo/Seo'
import { useDebouncedValue } from '../../../shared/timing/useDebouncedValue'
import { PageError } from '../../../shared/ui/PageError'
import { Pagination } from '../../../shared/ui/Pagination'
import { ProductGridSkeleton, productGridClass } from '../../../shared/ui/Skeletons'
import { useListCategoriesQuery, useListProductsQuery } from '../api'
import { ProductCard } from '../components/ProductCard'
import {
  applyListingChange,
  parseListingParams,
  toApiParams,
  toSearchParams,
  type ListingFilters,
  type Sort
} from '../listingParams'

const SORT_LABELS: Record<Sort, string> = {
  newest: 'Newest',
  price_asc: 'Price low to high',
  price_desc: 'Price high to low',
  name: 'Name A to Z'
}
const FIRST_ROW = 4

const categoryLink =
  'whitespace-nowrap py-3 text-eyebrow font-medium uppercase decoration-1 underline-offset-8 hover:underline aria-[current=page]:underline'

export function ProductsPage() {
  const [params, setParams] = useSearchParams()
  const filters = parseListingParams(params)
  const [searchText, setSearchText] = useState(filters.search)
  const [seenSearch, setSeenSearch] = useState(filters.search)
  const debouncedSearch = useDebouncedValue(searchText).trim()

  if (filters.search !== seenSearch) {
    setSeenSearch(filters.search)
    if (filters.search !== searchText.trim()) setSearchText(filters.search)
  }

  const hrefFor = (next: Partial<ListingFilters>) => {
    const query = toSearchParams(applyListingChange(filters, next)).toString()
    return query ? `/products?${query}` : '/products'
  }
  const change = (next: Partial<ListingFilters>) => setParams(toSearchParams(applyListingChange(filters, next)))

  useEffect(() => {
    if (debouncedSearch === searchText.trim() && debouncedSearch !== filters.search)
      setParams(toSearchParams(applyListingChange(filters, { search: debouncedSearch })), { replace: true })
  }, [debouncedSearch, searchText, filters, setParams])

  const { data: categories = [] } = useListCategoriesQuery()
  const { data, error, isLoading, isFetching, refetch } = useListProductsQuery(toApiParams(filters))
  const products = data?.products ?? []
  const pagination = data?.pagination
  const category = categories.find((entry) => entry.slug === filters.category)

  return (
    <div className="container-app pb-(--section-gap) pt-10 sm:pt-14">
      <Seo
        page="products"
        path="/products"
        category={category?.name}
        categorySlug={category?.slug}
        search={filters.search || undefined}
        sorted={filters.sort !== 'newest'}
      />
      <header>
        <p className="eyebrow">The collection</p>
        <h1 className="mt-3 text-h1 tracking-[-0.015em]">{category?.name ?? 'All objects'}</h1>
        {category?.description && <p className="mt-4 max-w-[62ch] text-lead text-ink-muted">{category.description}</p>}
      </header>

      <div className="sticky top-(--header-h) z-30 mt-8 flex flex-col gap-x-8 border-b border-line bg-paper lg:flex-row lg:items-center lg:justify-between">
        <nav
          aria-label="Categories"
          className="-mx-(--page-margin) flex gap-6 overflow-x-auto px-(--page-margin) [scrollbar-width:none]"
        >
          <Link to={hrefFor({ category: '' })} className={categoryLink} aria-current={category ? undefined : 'page'}>
            All
          </Link>
          {categories.map((entry) => (
            <Link
              key={entry.slug}
              to={hrefFor({ category: entry.slug })}
              className={categoryLink}
              aria-current={entry.slug === filters.category ? 'page' : undefined}
            >
              {entry.name}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-4 pb-3 lg:pb-0">
          <div role="search" className="relative flex-1 lg:w-56 lg:flex-none">
            <Search className="absolute left-0 top-1/2 -translate-y-1/2 text-ink-muted" size={18} strokeWidth={1.5} />
            <input
              type="search"
              aria-label="Search the collection"
              className="w-full border-b border-line-strong bg-transparent py-2 pl-7 text-base placeholder:text-ink-subtle focus:border-ink focus:outline-none sm:text-sm"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Search"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <span className="eyebrow">Sort</span>
            <select
              className="border-b border-line-strong bg-transparent py-2 pl-1 text-base focus:border-ink focus:outline-none sm:text-sm"
              value={filters.sort}
              onChange={(event) => change({ sort: event.target.value as Sort })}
            >
              {Object.entries(SORT_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="mt-8">
        {isLoading ? (
          <ProductGridSkeleton />
        ) : error ? (
          <PageError message={errorMessage(error)} retry={refetch} />
        ) : products.length ? (
          <>
            {pagination && (
              <p role="status" className="mb-6 text-caption text-ink-subtle">
                {pagination.total} {pagination.total === 1 ? 'object' : 'objects'}
              </p>
            )}
            <div
              aria-busy={isFetching}
              className={`${productGridClass} transition-opacity duration-(--dur-fast) ${isFetching ? 'opacity-60' : ''}`}
            >
              {products.map((product, index) => (
                <ProductCard key={product._id} product={product} eager={index < FIRST_ROW} />
              ))}
            </div>
            {pagination && <Pagination {...pagination} onChange={(page) => change({ page })} />}
          </>
        ) : (
          <div className="py-16">
            <h2 className="text-h3">{filters.search ? `Nothing matches “${filters.search}”.` : 'Nothing here yet.'}</h2>
            <p className="mt-3 text-ink-muted">Try a shorter word or browse a category.</p>
            <Link to="/products" className="btn-primary mt-8">
              Clear filters
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
