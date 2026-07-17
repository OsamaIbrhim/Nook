import { siteUrl } from './site'

export function mediaUrl(url?: string) {
  if (!url) return ''
  if (/^(https?:)?\/\//i.test(url) || url.startsWith('data:') || url.startsWith('blob:')) return url
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  return `${base}/${url.replace(/^\//, '')}`
}

export function absoluteMediaUrl(url?: string) {
  if (!url) return ''
  if (/^https?:\/\//i.test(url)) return url
  return `${siteUrl}/${url.replace(/^\//, '')}`
}
