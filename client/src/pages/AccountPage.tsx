import { LogOut, Shield } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { logout } from '../features/auth/authSlice'
export function AccountPage(){const user=useAppSelector(s=>s.auth.user)!;const dispatch=useAppDispatch();const nav=useNavigate();return <div className="container-app py-12"><div className="card mx-auto max-w-2xl p-8"><div className="grid size-16 place-items-center rounded-full bg-mint text-2xl font-black text-forest">{user.name[0]}</div><h1 className="mt-5 text-3xl font-black">{user.name}</h1><p className="text-black/50">{user.email}</p><div className="mt-7 flex items-center gap-3 rounded-xl bg-cream p-4 text-sm"><Shield className="text-forest"/><span className="capitalize">{user.role} account</span></div><button onClick={async()=>{await dispatch(logout());nav('/')}} className="btn-secondary mt-6 text-red-600"><LogOut size={17}/> Sign out</button></div></div>}
