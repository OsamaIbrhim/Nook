import { createApi, type BaseQueryFn } from '@reduxjs/toolkit/query/react'
import { request, toApiFailure, type RequestOptions } from './client'
import type { ApiFailure } from './errors'

export type ApiRequest = {
  url: string
  method?: RequestOptions['method']
  body?: unknown
  params?: RequestOptions['params']
  headers?: RequestOptions['headers']
  auth?: boolean
}

const httpBaseQuery: BaseQueryFn<ApiRequest, unknown, ApiFailure> = async ({ url, ...options }, api) => {
  try {
    return { data: await request(url, { ...options, signal: api.signal }) }
  } catch (error) {
    return { error: toApiFailure(error) }
  }
}

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: httpBaseQuery,
  tagTypes: ['Product', 'Category', 'Order', 'Quote', 'ShopConfig'],
  endpoints: () => ({})
})
