import type { RouteObject } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { PAGE_KEYS } from '../shared/seo/metadata'
import { routeObjects } from './router'
import { routes } from './routes'

const pathsOf = (nodes: RouteObject[], prefix = ''): string[] =>
  nodes.flatMap((node) => {
    const isRooted = !prefix || node.path?.startsWith('/')
    const own = node.path ? (isRooted ? node.path : `${prefix.replace(/\/$/, '')}/${node.path}`) : prefix
    const children = node.children ? pathsOf(node.children, own) : []
    return node.path || node.index ? [own, ...children] : children
  })

describe('route table', () => {
  it('has an entry, with a known page key, for every path the router serves', () => {
    const tablePaths = routes.map((route) => route.path)
    const served = [...new Set(pathsOf(routeObjects))]
    for (const path of served) expect(tablePaths, `no table entry for ${path}`).toContain(path)
    for (const route of routes) expect(PAGE_KEYS, route.path).toContain(route.page)
  })

  it('lists no path twice', () => {
    const paths = routes.map((route) => route.path)
    expect(new Set(paths).size).toBe(paths.length)
  })

  it('puts only public, indexable pages in the sitemap: home and the listing', () => {
    expect(routes.filter((route) => route.sitemap).map((route) => route.path)).toEqual(['/', '/products'])
  })
})
