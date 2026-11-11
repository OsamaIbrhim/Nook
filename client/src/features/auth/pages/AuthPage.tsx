import { AlertCircle } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { toast } from 'sonner'
import { errorMessage } from '../../../shared/http/errors'
import { useLoginMutation, useRegisterMutation } from '../api'
import { useSession } from '../useSession'

type Origin = { pathname: string; search?: string; hash?: string }

const copy = {
  login: {
    eyebrow: 'Welcome back',
    title: 'Sign in',
    text: 'Track your orders and check out faster.',
    submit: 'Sign in',
    done: 'Signed in',
    switchText: 'New to Nook?',
    switchLink: 'Create an account',
    switchTo: '/register'
  },
  register: {
    eyebrow: 'Join Nook',
    title: 'Create your account',
    text: 'Save your details and follow your orders.',
    submit: 'Create account',
    done: 'Account created',
    switchText: 'Already have an account?',
    switchLink: 'Sign in',
    switchTo: '/login'
  }
}

export function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const { user } = useSession()
  const [login, loginState] = useLoginMutation()
  const [register, registerState] = useRegisterMutation()
  const loading = loginState.isLoading || registerState.isLoading
  const location = useLocation()
  const from = (location.state as { from?: Origin } | null)?.from
  const text = copy[mode]
  const demoEmail = import.meta.env.VITE_DEMO_CUSTOMER_EMAIL
  const demoPassword = import.meta.env.VITE_DEMO_CUSTOMER_PASSWORD

  if (user) return <Navigate to={from ? `${from.pathname}${from.search ?? ''}${from.hash ?? ''}` : '/'} replace />

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    try {
      if (mode === 'login') await login({ email: form.email, password: form.password }).unwrap()
      else await register(form).unwrap()
      toast.success(text.done)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <div className="container-app grid min-h-[70vh] place-items-center py-(--section-gap)">
      <div className="w-full max-w-md">
        <p className="eyebrow">{text.eyebrow}</p>
        <h1 className="mt-3 text-h1 tracking-[-0.015em]">{text.title}</h1>
        <p className="mt-4 text-ink-muted">{text.text}</p>
        {error && (
          <p role="alert" className="mt-6 flex items-start gap-3 bg-paper-sunken p-4 text-sm text-danger">
            <AlertCircle size={18} strokeWidth={1.5} className="mt-0.5 shrink-0" aria-hidden="true" />
            {error}
          </p>
        )}
        <form onSubmit={submit} className="mt-8 space-y-5">
          {mode === 'register' && (
            <label className="block">
              <span className="label">Full name</span>
              <input
                className="field"
                required
                autoComplete="name"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
            </label>
          )}
          <label className="block">
            <span className="label">Email address</span>
            <input
              className="field"
              type="email"
              required
              autoComplete="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
            />
          </label>
          <label className="block">
            <span className="label">Password</span>
            <input
              className="field"
              type="password"
              minLength={8}
              required
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
            />
          </label>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Please wait…' : text.submit}
          </button>
        </form>
        {mode === 'login' && demoEmail && demoPassword && (
          <button
            type="button"
            className="btn-secondary mt-3 w-full"
            onClick={() => setForm({ name: '', email: demoEmail, password: demoPassword })}
          >
            Fill in the demo customer
          </button>
        )}
        <p className="mt-8 text-sm text-ink-muted">
          {text.switchText}{' '}
          <Link className="link-text text-ink" to={text.switchTo}>
            {text.switchLink}
          </Link>
        </p>
      </div>
    </div>
  )
}
