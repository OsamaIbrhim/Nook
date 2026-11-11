import { Suspense } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { ScrollReset } from '../../shared/motion/ScrollReset'
import { RouteFallback } from '../../shared/ui/RouteFallback'
import { AnnouncementBar } from './AnnouncementBar'
import { Footer } from './Footer'
import { Header } from './Header'

export function StoreLayout() {
  const location = useLocation()
  return (
    <>
      <ScrollReset />
      <a
        href="#main-content"
        className="fixed left-3 top-3 z-[100] -translate-y-24 bg-ink px-4 py-3 text-sm text-paper focus:translate-y-0"
      >
        Skip to content
      </a>
      <AnnouncementBar />
      <Header />
      <main className="min-h-[65vh]" id="main-content">
        <Suspense fallback={<RouteFallback />}>
          <div key={location.pathname} className="route-enter">
            <Outlet />
          </div>
        </Suspense>
      </main>
      <Footer />
    </>
  )
}
