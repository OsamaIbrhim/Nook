import { useLocation } from 'react-router-dom'
import type { PageKey } from '../shared/seo/metadata'
import { Seo } from '../shared/seo/Seo'

export function RouteMeta({ page }: { page: PageKey }) {
  const { pathname } = useLocation()
  return <Seo page={page} path={pathname} />
}
