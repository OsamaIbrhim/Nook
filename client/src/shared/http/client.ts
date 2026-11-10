import { HttpError, isApiFailure, type ApiFailure } from './errors'

const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1').replace(/\/$/, '')
const REQUEST_TIMEOUT_MS = 10_000

type HttpHooks = {
  getToken: () => string | null
  refreshSession: () => Promise<string | null>
}

let hooks: HttpHooks = { getToken: () => null, refreshSession: async () => null }
let refreshInFlight: Promise<string | null> | null = null

export const configureHttp = (next: Partial<HttpHooks>) => {
  hooks = { ...hooks, ...next }
}

export type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: unknown
  params?: Record<string, string | number | boolean | undefined>
  headers?: Record<string, string>
  signal?: AbortSignal
  auth?: boolean
}

function buildUrl(path: string, params: RequestOptions['params']) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params ?? {})) if (value !== undefined) query.set(key, String(value))
  const search = query.toString()
  return `${baseUrl}${path}${search ? `?${search}` : ''}`
}

async function send(path: string, options: RequestOptions, token: string | null) {
  const headers = new Headers(options.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)
  let body: BodyInit | undefined
  if (options.body instanceof FormData) body = options.body
  else if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json')
    body = JSON.stringify(options.body)
  }
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout
  try {
    return await fetch(buildUrl(path, options.params), {
      method: options.method ?? 'GET',
      headers,
      body,
      credentials: 'include',
      signal
    })
  } catch (error) {
    if (options.signal?.aborted) throw error
    if (timeout.aborted) throw new HttpError({ status: 0, code: 'timeout', message: 'The request timed out' })
    throw new HttpError({ status: 0, code: 'network_error', message: 'The request could not be sent' })
  }
}

async function failureOf(response: Response): Promise<HttpError> {
  const body = await response.json().catch(() => null)
  const error = body?.error
  return new HttpError({
    status: response.status,
    code: typeof error?.code === 'string' ? error.code : 'http_error',
    message: typeof error?.message === 'string' ? error.message : `Request failed (${response.status})`,
    fieldErrors: Array.isArray(error?.fieldErrors) ? error.fieldErrors : undefined
  })
}

function refreshOnce() {
  refreshInFlight ??= hooks.refreshSession().finally(() => {
    refreshInFlight = null
  })
  return refreshInFlight
}

export async function request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  const sentWith = options.auth === false ? null : hooks.getToken()
  let response = await send(path, options, sentWith)
  if (response.status === 401 && sentWith) {
    const current = hooks.getToken()
    const retryWith = current && current !== sentWith ? current : await refreshOnce()
    if (retryWith) response = await send(path, options, retryWith)
  }
  if (!response.ok) throw await failureOf(response)
  if (response.status === 204) return undefined as T
  return (await response.json()).data as T
}

export const toApiFailure = (error: unknown): ApiFailure =>
  isApiFailure(error)
    ? { status: error.status, code: error.code, message: error.message, fieldErrors: error.fieldErrors }
    : { status: 0, code: 'unknown', message: 'Something went wrong' }
