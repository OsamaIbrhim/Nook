import { Suspense } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Footer } from '../components/Footer'
import { RouteFallback } from '../components/RouteFallback'
import { Header } from '../components/Header'
import { Seo } from '../components/Seo'
import { SmoothScroll } from '../components/SmoothScroll'

export function StoreLayout() {
  const location = useLocation()
  const privateRoute = /^\/(cart|checkout|orders|account|login|register)/.test(location.pathname)
  const listing = location.pathname === '/products'
  return <>
    <SmoothScroll/>
    {privateRoute ? <Seo title="Customer Area" description="Secure Nook customer account and checkout area." path={location.pathname} noindex/> : listing ? <Seo title="Curated Home, Kitchen & Workspace Objects" description="Explore useful, distinctive objects for home, kitchen, workspace, and wellness—selected for honest materials, clear function, and lasting presence." path="/products"/> : null}
    <Header/>
    {location.pathname !== '/' && <div className="h-[98px]" aria-hidden="true"/>}
    <main className="min-h-[65vh]" id="main-content"><Suspense fallback={<RouteFallback/>}><div key={location.pathname} className="route-enter"><Outlet/></div></Suspense></main>
    <Footer/>
  </>
}
