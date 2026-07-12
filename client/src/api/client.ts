import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'
export const api = axios.create({ baseURL, withCredentials: true })

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = sessionStorage.getItem('accessToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let refreshing: Promise<string> | null = null
api.interceptors.response.use((response) => response, async (error: AxiosError) => {
  const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean }
  const isAuthRoute = original?.url?.includes('/auth/login') || original?.url?.includes('/auth/register') || original?.url?.includes('/auth/refresh')
  if (error.response?.status === 401 && original && !original._retry && !isAuthRoute) {
    original._retry = true
    refreshing ||= axios.post(`${baseURL}/auth/refresh`, {}, { withCredentials: true })
      .then(({ data }) => { const token = data.data.accessToken; sessionStorage.setItem('accessToken', token); window.dispatchEvent(new CustomEvent('auth:refreshed', { detail: token })); return token })
      .finally(() => { refreshing = null })
    try { const token = await refreshing; original.headers.Authorization = `Bearer ${token}`; return api(original) }
    catch { sessionStorage.removeItem('accessToken'); localStorage.removeItem('user'); window.dispatchEvent(new Event('auth:expired')) }
  }
  return Promise.reject(error)
})

export function errorMessage(error: unknown) {
  if (typeof error === 'string') return error
  if (axios.isAxiosError(error)) {
    if (!error.response) return navigator.onLine ? 'The server could not be reached. Please try again.' : 'You appear to be offline.'
    return error.response.data?.error?.message || error.message
  }
  return error instanceof Error ? error.message : 'Something went wrong'
}
