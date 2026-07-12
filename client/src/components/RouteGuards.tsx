import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAppSelector } from '../app/hooks'
import { Spinner } from './Spinner'
export function ProtectedRoute() { const { user, initialized } = useAppSelector((s) => s.auth); const location = useLocation(); if (!initialized) return <Spinner full/>; return user ? <Outlet/> : <Navigate to="/login" state={{ from: location }} replace/> }
export function AdminRoute() { const { user, initialized } = useAppSelector((s) => s.auth); if (!initialized) return <Spinner full/>; return user?.role === 'admin' ? <Outlet/> : <Navigate to="/" replace/> }
