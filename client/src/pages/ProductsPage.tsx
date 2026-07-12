import { SlidersHorizontal } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api, errorMessage } from '../api/client'
import { PageError } from '../components/PageError'
import { Pagination } from '../components/Pagination'
import { ProductCard } from '../components/ProductCard'
import { ProductGridSkeleton } from '../components/Skeletons'
import type { ApiResponse, Category, Pagination as PaginationType, Product } from '../types'
import { useDebouncedValue } from '../utils/useDebouncedValue'

export function ProductsPage() {
  const [params, setParams] = useSearchParams()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [pagination, setPagination] = useState<PaginationType>()
  const [search, setSearch] = useState(params.get('search') || '')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const debouncedSearch = useDebouncedValue(search)
  const query = params.toString()

  useEffect(() => {
    api.get<ApiResponse<{ categories: Category[] }>>('/categories')
      .then((response) => setCategories(response.data.data.categories))
      .catch(() => setCategories([]))
  }, [])

  useEffect(() => {
    const next = new URLSearchParams(params)
    if (debouncedSearch) next.set('search', debouncedSearch)
    else next.delete('search')
    if (next.get('search') !== params.get('search')) {
      next.delete('page')
      setParams(next, { replace: true })
    }
  }, [debouncedSearch, params, setParams])

  useEffect(() => {
    setLoading(true)
    api.get<ApiResponse<{ products: Product[]; pagination: PaginationType }>>(`/products?${query}`)
      .then((response) => {
        setProducts(response.data.data.products)
        setPagination(response.data.data.pagination)
        setError('')
      })
      .catch((reason) => setError(errorMessage(reason)))
      .finally(() => setLoading(false))
  }, [query])

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== 'page') next.delete('page')
    setParams(next)
  }

  return <div className="container-app py-8 sm:py-10">
    <div className="mb-7 sm:mb-9">
      <p className="text-xs font-bold uppercase tracking-[.2em] text-forest">The collection</p>
      <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Find your next favorite</h1>
      <p className="mt-3 text-black/50">Objects with purpose, personality, and staying power.</p>
    </div>
    <div className="mb-8 grid gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 sm:grid-cols-4">
      <div className="relative sm:col-span-2"><SlidersHorizontal className="absolute left-3 top-1/2 -translate-y-1/2 text-black/35" size={17}/><input aria-label="Search products" className="field !pl-10" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search the collection"/></div>
      <select aria-label="Product category" className="field" value={params.get('category') || ''} onChange={(event) => update('category', event.target.value)}><option value="">All categories</option>{categories.map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}</select>
      <select aria-label="Sort products" className="field" value={params.get('sort') || 'newest'} onChange={(event) => update('sort', event.target.value)}><option value="newest">Newest</option><option value="price_asc">Price: low to high</option><option value="price_desc">Price: high to low</option><option value="name">Name</option></select>
    </div>
    {loading ? <ProductGridSkeleton/> : error ? <PageError message={error} retry={() => window.location.reload()}/> : products.length ? <>
      <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">{products.map((product) => <ProductCard key={product._id} product={product}/>)}</div>
      {pagination && <Pagination {...pagination} onChange={(page) => update('page', String(page))}/>} 
    </> : <div className="py-20 text-center"><h2 className="text-xl font-bold">No products found</h2><p className="mt-2 text-black/50">Try a different search or category.</p></div>}
  </div>
}
