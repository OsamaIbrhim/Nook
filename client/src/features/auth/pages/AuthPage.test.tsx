import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { Provider } from 'react-redux'
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { createStore } from '../../../app/store'
import { server } from '../../../test/server'
import { AuthPage } from './AuthPage'

const maya = {
  _id: 'a'.repeat(24),
  name: 'Maya Hassan',
  email: 'maya@example.test',
  role: 'customer',
  isActive: true,
  createdAt: '2026-11-01T10:00:00.000Z'
}

function Where() {
  const { pathname, search } = useLocation()
  return <p>now at {pathname + search}</p>
}

function renderLogin(from?: { pathname: string; search: string }) {
  const router = createMemoryRouter(
    [
      { path: '/login', element: <AuthPage mode="login" /> },
      { path: '*', element: <Where /> }
    ],
    { initialEntries: [{ pathname: '/login', state: from ? { from } : undefined }] }
  )
  render(
    <Provider store={createStore()}>
      <RouterProvider router={router} />
    </Provider>
  )
}

async function signIn() {
  await userEvent.type(screen.getByLabelText('Email address'), 'maya@example.test')
  await userEvent.type(screen.getByLabelText('Password'), 'Passw0rd-test')
  await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
}

describe('AuthPage login', () => {
  it('returns the user to the page they were sent from, query string included', async () => {
    server.use(
      http.post('http://localhost:3000/api/v1/auth/login', () =>
        HttpResponse.json({ success: true, data: { user: maya, accessToken: 'token' } })
      )
    )
    renderLogin({ pathname: '/orders', search: '?page=2' })
    await signIn()
    expect(await screen.findByText('now at /orders?page=2')).toBeInTheDocument()
  })

  it('goes home when there was no page to return to', async () => {
    server.use(
      http.post('http://localhost:3000/api/v1/auth/login', () =>
        HttpResponse.json({ success: true, data: { user: maya, accessToken: 'token' } })
      )
    )
    renderLogin()
    await signIn()
    expect(await screen.findByText('now at /')).toBeInTheDocument()
  })

  it('shows the server message and stays on the page when the password is wrong', async () => {
    server.use(
      http.post('http://localhost:3000/api/v1/auth/login', () =>
        HttpResponse.json(
          { success: false, error: { message: 'Invalid email or password', code: 'unauthorized' } },
          { status: 401 }
        )
      )
    )
    renderLogin()
    await signIn()
    await waitFor(() => expect(screen.getByText('Invalid email or password')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /sign in/i })).toBeEnabled()
  })
})
