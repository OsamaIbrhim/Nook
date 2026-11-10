import { baseApi } from '../../shared/http/baseApi'
import type { ShopConfig } from '../../shared/contract/types'

const policyApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getShopConfig: build.query<ShopConfig, void>({
      query: () => ({ url: '/shop/config' }),
      providesTags: ['ShopConfig'],
      keepUnusedDataFor: 3600
    })
  })
})

export const { useGetShopConfigQuery } = policyApi
