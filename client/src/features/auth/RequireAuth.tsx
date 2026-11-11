import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Spinner } from '../../shared/ui/Spinner'
import { useSession } from './useSession'

export function RequireAuth() {
  const { user, status } = useSession()
  const location = useLocation()
  if (status === 'unknown') return <Spinner full />
  return user ? <Outlet /> : <Navigate to="/login" state={{ from: location }} replace />
}

export function RequireAdmin() {
  const { user, status } = useSession()
  if (status === 'unknown') return <Spinner full />
  return user?.role === 'admin' ? <Outlet /> : <Navigate to="/" replace />
}
