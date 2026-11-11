import { lazy } from 'react'

export const HomePage = lazy(() =>
  import('../features/home/pages/HomePage').then((module) => ({ default: module.HomePage }))
)
export const ProductsPage = lazy(() =>
  import('../features/catalog/pages/ProductsPage').then((module) => ({ default: module.ProductsPage }))
)
export const ProductDetailPage = lazy(() =>
  import('../features/catalog/pages/ProductDetailPage').then((module) => ({ default: module.ProductDetailPage }))
)
export const CartPage = lazy(() =>
  import('../features/cart/pages/CartPage').then((module) => ({ default: module.CartPage }))
)
export const AuthPage = lazy(() =>
  import('../features/auth/pages/AuthPage').then((module) => ({ default: module.AuthPage }))
)
export const CheckoutPage = lazy(() =>
  import('../features/checkout/pages/CheckoutPage').then((module) => ({ default: module.CheckoutPage }))
)
export const CheckoutSuccessPage = lazy(() =>
  import('../features/checkout/pages/CheckoutSuccessPage').then((module) => ({ default: module.CheckoutSuccessPage }))
)
export const OrdersPage = lazy(() =>
  import('../features/orders/pages/OrdersPage').then((module) => ({ default: module.OrdersPage }))
)
export const OrderDetailPage = lazy(() =>
  import('../features/orders/pages/OrderDetailPage').then((module) => ({ default: module.OrderDetailPage }))
)
export const AccountPage = lazy(() =>
  import('../features/auth/pages/AccountPage').then((module) => ({ default: module.AccountPage }))
)
export const DashboardPage = lazy(() =>
  import('../features/admin/pages/DashboardPage').then((module) => ({ default: module.DashboardPage }))
)
export const ProductsAdminPage = lazy(() =>
  import('../features/admin/pages/ProductsAdminPage').then((module) => ({ default: module.ProductsAdminPage }))
)
export const OrdersAdminPage = lazy(() =>
  import('../features/admin/pages/OrdersAdminPage').then((module) => ({ default: module.OrdersAdminPage }))
)
export const UsersAdminPage = lazy(() =>
  import('../features/admin/pages/UsersAdminPage').then((module) => ({ default: module.UsersAdminPage }))
)
