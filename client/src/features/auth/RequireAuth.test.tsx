import { render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { createStore } from '../../app/store'
import { RequireAdmin, RequireAuth } from './RequireAuth'
import { sessionStarted } from './authSlice'
import { setSessionHint } from './session'

const user = (role: 'customer' | 'admin') => ({
  _id: 'a'.repeat(24),
  name: 'Maya',
  email: 'maya@example.test',
  role,
  isActive: true,
  createdAt: '2026-11-01T10:00:00.000Z'
})

function LoginProbe() {
  const location = useLocation()
  const from = location.state?.from
  return (
    <p>
      login page, came from {from?.pathname}
      {from?.search}
    </p>
  )
}

function renderAt(path: string, store = createStore()) {
  const router = createMemoryRouter(
    [
      { path: '/login', element: <LoginProbe /> },
      { path: '/', element: <p>home</p> },
      { element: <RequireAuth />, children: [{ path: '/orders', element: <p>private orders</p> }] },
      { element: <RequireAdmin />, children: [{ path: '/admin', element: <p>admin area</p> }] }
    ],
    { initialEntries: [path] }
  )
  render(
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>
  )
  return store
}

describe('RequireAuth', () => {
  it('sends a guest to the login page at once, remembering the full original URL including the query string', () => {
    renderAt('/orders?page=2')
    expect(screen.getByText('login page, came from /orders?page=2')).toBeInTheDocument()
  })

  it('shows a loading state, not the page and not the login page, while a returning user is being restored', () => {
    setSessionHint()
    renderAt('/orders')
    expect(screen.getByLabelText('Loading')).toBeInTheDocument()
    expect(screen.queryByText('private orders')).not.toBeInTheDocument()
    expect(screen.queryByText(/login page/)).not.toBeInTheDocument()
  })

  it('shows the page to a signed-in user', () => {
    const store = createStore()
    store.dispatch(sessionStarted(user('customer')))
    renderAt('/orders', store)
    expect(screen.getByText('private orders')).toBeInTheDocument()
  })
})

describe('RequireAdmin', () => {
  it('lets an admin in', () => {
    const store = createStore()
    store.dispatch(sessionStarted(user('admin')))
    renderAt('/admin', store)
    expect(screen.getByText('admin area')).toBeInTheDocument()
  })

  it('sends a customer home and a guest home', () => {
    const store = createStore()
    store.dispatch(sessionStarted(user('customer')))
    renderAt('/admin', store)
    expect(screen.getByText('home')).toBeInTheDocument()
  })
})
