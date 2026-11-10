import { Suspense } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Footer } from './Footer'
import { RouteFallback } from '../../shared/ui/RouteFallback'
import { Header } from './Header'
import { SmoothScroll } from '../../shared/motion/SmoothScroll'

export function StoreLayout() {
  const location = useLocation()
  return (
    <>
      <SmoothScroll />
      <Header />
      {location.pathname !== '/' && <div className="h-[98px]" aria-hidden="true" />}
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
