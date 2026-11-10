import { baseApi } from '../../shared/http/baseApi'
import type { Category, Pagination, Product } from '../../shared/contract/types'

export type ProductListParams = Record<string, string | number | undefined>
type ProductList = { products: Product[]; pagination: Pagination }

const catalogApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listProducts: build.query<ProductList, ProductListParams>({
      query: (params) => ({ url: '/products', params }),
      providesTags: ['Product'],
      keepUnusedDataFor: 60
    }),
    getProduct: build.query<Product, string>({
      query: (slug) => ({ url: `/products/${encodeURIComponent(slug)}` }),
      transformResponse: (response: { product: Product }) => response.product,
      providesTags: ['Product'],
      keepUnusedDataFor: 60
    }),
    listCategories: build.query<Category[], void>({
      query: () => ({ url: '/categories' }),
      transformResponse: (response: { categories: Category[] }) => response.categories,
      providesTags: ['Category'],
      keepUnusedDataFor: 60
    })
  })
})

export const { useGetProductQuery, useListCategoriesQuery, useListProductsQuery } = catalogApi
