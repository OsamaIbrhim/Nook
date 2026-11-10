import { SlidersHorizontal } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { errorMessage } from '../../../shared/http/errors'
import { useListCategoriesQuery, useListProductsQuery } from '../api'
import {
  applyListingChange,
  parseListingParams,
  toApiParams,
  toSearchParams,
  type ListingFilters,
  type Sort
} from '../listingParams'
import { PageError } from '../../../shared/ui/PageError'
import { Pagination } from '../../../shared/ui/Pagination'
import { ProductCard } from '../components/ProductCard'
import { SelectMenu } from '../components/SelectMenu'
import { ProductGridSkeleton } from '../../../shared/ui/Skeletons'
import { Seo } from '../../../shared/seo/Seo'
import { useDebouncedValue } from '../../../shared/timing/useDebouncedValue'

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

  const change = (next: Partial<ListingFilters>, options?: { replace: boolean }) =>
    setParams(toSearchParams(applyListingChange(filters, next)), options)

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
    <div className="container-app py-8 sm:py-10">
      <Seo
        page="products"
        path="/products"
        category={category?.name}
        categorySlug={category?.slug}
        search={filters.search || undefined}
        sorted={filters.sort !== 'newest'}
      />
      <div className="mb-7 sm:mb-9">
        <p className="text-xs font-bold uppercase tracking-[.2em] text-forest">The collection</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Find your next favorite</h1>
        <p className="mt-3 text-black/50">Objects with purpose, personality, and staying power.</p>
      </div>
      <div className="mb-8 grid gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 sm:grid-cols-4">
        <div className="relative sm:col-span-2">
          <SlidersHorizontal className="absolute left-3 top-1/2 -translate-y-1/2 text-black/35" size={17} />
          <input
            aria-label="Search products"
            className="field !pl-10"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Search the collection"
          />
        </div>
        <SelectMenu
          label="Category"
          value={filters.category}
          onChange={(value) => change({ category: value })}
          options={[
            { value: '', label: 'All categories' },
            ...categories.map((category) => ({ value: category.slug, label: category.name }))
          ]}
        />
        <SelectMenu
          label="Sort"
          value={filters.sort}
          onChange={(value) => change({ sort: value as Sort })}
          options={[
            { value: 'newest', label: 'Newest first' },
            { value: 'price_asc', label: 'Price: low to high' },
            { value: 'price_desc', label: 'Price: high to low' },
            { value: 'name', label: 'Name A–Z' }
          ]}
        />
      </div>
      {isLoading ? (
        <ProductGridSkeleton />
      ) : error ? (
        <PageError message={errorMessage(error)} retry={refetch} />
      ) : products.length ? (
        <>
          <div
            aria-busy={isFetching}
            className={`grid grid-cols-2 gap-4 transition-opacity sm:gap-6 lg:grid-cols-4 ${isFetching ? 'opacity-60' : ''}`}
          >
            {products.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
          {pagination && <Pagination {...pagination} onChange={(page) => change({ page })} />}
        </>
      ) : (
        <div className="py-20 text-center">
          <h2 className="text-xl font-bold">No products found</h2>
          <p className="mt-2 text-black/50">Try a different search or category.</p>
        </div>
      )}
    </div>
  )
}
