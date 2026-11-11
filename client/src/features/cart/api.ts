import { baseApi } from '../../shared/http/baseApi'
import type { Quote } from '../../shared/contract/types'
import type { CartLine } from './cartLines'

const cartApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    quoteCart: build.query<Quote, CartLine[]>({
      query: (lines) => ({ url: '/cart/quote', method: 'POST', body: { lines } }),
      providesTags: ['Quote'],
      keepUnusedDataFor: 60
    })
  })
})

export const { useQuoteCartQuery } = cartApi
