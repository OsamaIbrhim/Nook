import { baseApi } from '../../shared/http/baseApi'
import type { Order } from '../../shared/contract/types'

const ordersApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listMyOrders: build.query<Order[], void>({
      query: () => ({ url: '/orders/mine' }),
      transformResponse: (response: { orders: Order[] }) => response.orders,
      providesTags: ['Order'],
      keepUnusedDataFor: 5
    }),
    getOrder: build.query<Order, string>({
      query: (id) => ({ url: `/orders/${encodeURIComponent(id)}` }),
      transformResponse: (response: { order: Order }) => response.order,
      providesTags: ['Order'],
      keepUnusedDataFor: 5
    })
  })
})

export const { useGetOrderQuery, useListMyOrdersQuery } = ordersApi
