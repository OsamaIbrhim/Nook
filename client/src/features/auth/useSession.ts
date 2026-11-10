import { useSelector } from 'react-redux'
import type { AuthState } from './authSlice'

export const useSession = () => useSelector((state: { auth: AuthState }) => state.auth)
