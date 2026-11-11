import type { ReactNode } from 'react'
import { createBrowserRouter, type RouteObject } from 'react-router-dom'
import { AdminLayout } from '../features/admin/AdminLayout'
import { RequireAdmin, RequireAuth } from '../features/auth/RequireAuth'
import { NotFoundPage } from '../features/shell/pages/NotFoundPage'
import { StoreLayout } from '../features/shell/StoreLayout'
import {
  AccountPage,
  AuthPage,
  CartPage,
  CheckoutPage,
  CheckoutSuccessPage,
  DashboardPage,
  HomePage,
  OrderDetailPage,
  OrdersAdminPage,
  OrdersPage,
  ProductDetailPage,
  ProductsAdminPage,
  ProductsPage,
  UsersAdminPage
} from './pages'
import { RouteMeta } from './RouteMeta'
import type { PageKey } from '../shared/seo/metadata'

const withMeta = (page: PageKey, element: ReactNode) => (
  <>
    <RouteMeta page={page} />
    {element}
  </>
)

export const routeObjects: RouteObject[] = [
  {
    element: <StoreLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/products', element: <ProductsPage /> },
      { path: '/products/:slug', element: <ProductDetailPage /> },
      { path: '/cart', element: withMeta('cart', <CartPage />) },
      { path: '/login', element: withMeta('login', <AuthPage mode="login" />) },
      { path: '/register', element: withMeta('register', <AuthPage mode="register" />) },
      {
        element: <RequireAuth />,
        children: [
          { path: '/checkout', element: withMeta('checkout', <CheckoutPage />) },
          { path: '/checkout/success', element: withMeta('checkout-success', <CheckoutSuccessPage />) },
          { path: '/orders', element: withMeta('orders', <OrdersPage />) },
          { path: '/orders/:id', element: withMeta('order', <OrderDetailPage />) },
          { path: '/account', element: withMeta('account', <AccountPage />) }
        ]
      }
    ]
  },
  {
    element: <RequireAdmin />,
    children: [
      {
        path: '/admin',
        element: <AdminLayout />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'products', element: <ProductsAdminPage /> },
          { path: 'orders', element: <OrdersAdminPage /> },
          { path: 'users', element: <UsersAdminPage /> }
        ]
      }
    ]
  },
  { path: '*', element: withMeta('not-found', <NotFoundPage />) }
]

export const router = createBrowserRouter(routeObjects, {
  basename: import.meta.env.BASE_URL.replace(/\/$/, '') || '/'
})
