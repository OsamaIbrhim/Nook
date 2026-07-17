import { lazy, useEffect } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { Toaster } from 'sonner'
import { useAppDispatch } from './app/hooks'
import { NetworkBanner } from './components/NetworkBanner'
import { AdminRoute, ProtectedRoute } from './components/RouteGuards'
import { restoreSession, sessionExpired, tokenRefreshed } from './features/auth/authSlice'
import { AdminLayout } from './layouts/AdminLayout'
import { StoreLayout } from './layouts/StoreLayout'

const HomePage = lazy(() => import('./pages/HomePage').then((module) => ({ default: module.HomePage })))
const ProductsPage = lazy(() => import('./pages/ProductsPage').then((module) => ({ default: module.ProductsPage })))
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage').then((module) => ({ default: module.ProductDetailPage })))
const CartPage = lazy(() => import('./pages/CartPage').then((module) => ({ default: module.CartPage })))
const AuthPage = lazy(() => import('./pages/AuthPage').then((module) => ({ default: module.AuthPage })))
const CheckoutPage = lazy(() => import('./pages/CheckoutPage').then((module) => ({ default: module.CheckoutPage })))
const CheckoutSuccessPage = lazy(() => import('./pages/CheckoutSuccessPage').then((module) => ({ default: module.CheckoutSuccessPage })))
const OrdersPage = lazy(() => import('./pages/OrdersPage').then((module) => ({ default: module.OrdersPage })))
const OrderDetailPage = lazy(() => import('./pages/OrderDetailPage').then((module) => ({ default: module.OrderDetailPage })))
const AccountPage = lazy(() => import('./pages/AccountPage').then((module) => ({ default: module.AccountPage })))
const DashboardPage = lazy(() => import('./pages/admin/DashboardPage').then((module) => ({ default: module.DashboardPage })))
const ProductsAdminPage = lazy(() => import('./pages/admin/ProductsAdminPage').then((module) => ({ default: module.ProductsAdminPage })))
const OrdersAdminPage = lazy(() => import('./pages/admin/OrdersAdminPage').then((module) => ({ default: module.OrdersAdminPage })))
const UsersAdminPage = lazy(() => import('./pages/admin/UsersAdminPage').then((module) => ({ default: module.UsersAdminPage })))

const router = createBrowserRouter([
  {
    element: <StoreLayout/>,
    children: [
      { path: '/', element: <HomePage/> },
      { path: '/products', element: <ProductsPage/> },
      { path: '/products/:id', element: <ProductDetailPage/> },
      { path: '/cart', element: <CartPage/> },
      { path: '/login', element: <AuthPage mode="login"/> },
      { path: '/register', element: <AuthPage mode="register"/> },
      {
        element: <ProtectedRoute/>,
        children: [
          { path: '/checkout', element: <CheckoutPage/> },
          { path: '/checkout/success', element: <CheckoutSuccessPage/> },
          { path: '/orders', element: <OrdersPage/> },
          { path: '/orders/:id', element: <OrderDetailPage/> },
          { path: '/account', element: <AccountPage/> }
        ]
      }
    ]
  },
  {
    element: <AdminRoute/>,
    children: [{ path: '/admin', element: <AdminLayout/>, children: [
      { index: true, element: <DashboardPage/> },
      { path: 'products', element: <ProductsAdminPage/> },
      { path: 'orders', element: <OrdersAdminPage/> },
      { path: 'users', element: <UsersAdminPage/> }
    ] }]
  },
  { path: '*', element: <div className="grid min-h-screen place-items-center bg-[#f2efe6] text-center"><div><p className="text-xs font-black uppercase tracking-[.2em]">Page not found</p><h1 className="text-8xl font-black tracking-[-.06em]">404</h1><a href={import.meta.env.BASE_URL} className="btn-primary mt-5">Back home</a></div></div> }
], { basename: import.meta.env.BASE_URL.replace(/\/$/, '') || '/' })

export default function App() {
  const dispatch = useAppDispatch()
  useEffect(() => {
    dispatch(restoreSession())
    const expired = () => dispatch(sessionExpired())
    const refreshed = (event: Event) => dispatch(tokenRefreshed((event as CustomEvent<string>).detail))
    window.addEventListener('auth:expired', expired)
    window.addEventListener('auth:refreshed', refreshed)
    return () => {
      window.removeEventListener('auth:expired', expired)
      window.removeEventListener('auth:refreshed', refreshed)
    }
  }, [dispatch])
  return <><RouterProvider router={router}/><NetworkBanner/><Toaster richColors closeButton position="top-right"/></>
}
