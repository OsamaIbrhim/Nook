export const SORTS = ['newest', 'price_asc', 'price_desc', 'name'] as const
export type Sort = (typeof SORTS)[number]
export type ListingFilters = { search: string; category: string; sort: Sort; page: number }

const DEFAULT_SORT: Sort = 'newest'
const MAX_SEARCH_LENGTH = 60
const LEGACY_CATEGORY_ID = /^[a-f\d]{24}$/i

const isSort = (value: string | null): value is Sort => SORTS.includes(value as Sort)

export function parseListingParams(params: URLSearchParams): ListingFilters {
  const sort = params.get('sort')
  const page = Number(params.get('page'))
  const category = (params.get('category') ?? '').trim().toLowerCase()
  return {
    search: (params.get('search') ?? '').trim().slice(0, MAX_SEARCH_LENGTH),
    category: LEGACY_CATEGORY_ID.test(category) ? '' : category,
    sort: isSort(sort) ? sort : DEFAULT_SORT,
    page: Number.isInteger(page) && page > 0 ? page : 1
  }
}

export function toSearchParams(filters: ListingFilters): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.search) params.set('search', filters.search)
  if (filters.category) params.set('category', filters.category)
  if (filters.sort !== DEFAULT_SORT) params.set('sort', filters.sort)
  if (filters.page > 1) params.set('page', String(filters.page))
  return params
}

export function applyListingChange(current: ListingFilters, change: Partial<ListingFilters>): ListingFilters {
  return { ...current, ...change, page: change.page ?? 1 }
}

export function toApiParams(filters: ListingFilters): Record<string, string | number> {
  const params: Record<string, string | number> = {}
  if (filters.search) params.search = filters.search
  if (filters.category) params.category = filters.category
  if (filters.sort !== DEFAULT_SORT) params.sort = filters.sort
  if (filters.page > 1) params.page = filters.page
  return params
}
