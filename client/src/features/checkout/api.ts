import { baseApi } from '../../shared/http/baseApi'
import type { CheckoutSession, Order, OrderRequest } from '../../shared/contract/types'

const checkoutApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    createOrder: build.mutation<Order, { body: OrderRequest; idempotencyKey: string }>({
      query: ({ body, idempotencyKey }) => ({
        url: '/orders',
        method: 'POST',
        body,
        headers: { 'Idempotency-Key': idempotencyKey }
      }),
      transformResponse: (response: { order: Order }) => response.order,
      invalidatesTags: ['Order', 'Product', 'Quote']
    }),
    createCheckoutSession: build.mutation<CheckoutSession, string>({
      query: (orderId) => ({ url: '/payments/checkout-session', method: 'POST', body: { orderId } })
    }),
    getOrderBySession: build.query<Order, string>({
      query: (sessionId) => ({ url: `/orders/by-session/${encodeURIComponent(sessionId)}` }),
      transformResponse: (response: { order: Order }) => response.order,
      providesTags: ['Order'],
      keepUnusedDataFor: 5
    })
  })
})

export const { useCreateCheckoutSessionMutation, useCreateOrderMutation, useGetOrderBySessionQuery } = checkoutApi
