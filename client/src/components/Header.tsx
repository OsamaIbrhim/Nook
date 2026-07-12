import { Menu, Search, ShoppingBag, UserRound, X } from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { logout } from '../features/auth/authSlice'
export function Header() {
  const [open, setOpen] = useState(false); const [search, setSearch] = useState('')
  const { user } = useAppSelector((s) => s.auth); const count = useAppSelector((s) => s.cart.items.reduce((n, i) => n + i.quantity, 0)); const dispatch = useAppDispatch(); const navigate = useNavigate()
  const submit = (e: React.FormEvent) => { e.preventDefault(); navigate(`/products?search=${encodeURIComponent(search)}`); setOpen(false) }
  const link = ({ isActive }: { isActive: boolean }) => `text-sm font-medium transition hover:text-forest ${isActive ? 'text-forest' : 'text-black/65'}`
  return <header className="sticky top-0 z-40 border-b border-black/5 bg-[#fbfaf7]/90 backdrop-blur-xl"><div className="container-app flex h-18 items-center justify-between gap-5">
    <Link to="/" className="flex items-center gap-2 text-xl font-black tracking-tight"><span className="grid size-9 place-items-center rounded-full bg-forest text-sm text-white">N</span>Nook.</Link>
    <nav className="hidden items-center gap-8 md:flex"><NavLink to="/products" className={link}>Shop</NavLink><NavLink to="/orders" className={link}>Orders</NavLink>{user?.role === 'admin' && <NavLink to="/admin" className={link}>Admin</NavLink>}</nav>
    <form onSubmit={submit} className="hidden max-w-xs flex-1 md:flex"><div className="relative w-full"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-black/35" size={17}/><input value={search} onChange={(e) => setSearch(e.target.value)} className="field !rounded-full !py-2.5 !pl-10" placeholder="Search products"/></div></form>
    <div className="flex items-center gap-1"><Link to={user ? '/account' : '/login'} className="grid size-10 place-items-center rounded-full hover:bg-black/5" aria-label="Account"><UserRound size={20}/></Link><Link to="/cart" className="relative grid size-10 place-items-center rounded-full hover:bg-black/5" aria-label="Shopping bag"><ShoppingBag size={20}/>{count > 0 && <span className="absolute right-0 top-0 grid size-5 place-items-center rounded-full bg-coral text-[10px] font-bold text-white">{count}</span>}</Link><button onClick={() => setOpen(!open)} className="grid size-10 place-items-center md:hidden">{open ? <X/> : <Menu/>}</button></div>
  </div>{open && <div className="border-t border-black/5 bg-white px-4 py-5 md:hidden"><form onSubmit={submit} className="mb-4"><input value={search} onChange={(e) => setSearch(e.target.value)} className="field" placeholder="Search products"/></form><nav className="flex flex-col gap-4"><Link onClick={() => setOpen(false)} to="/products">Shop</Link><Link onClick={() => setOpen(false)} to="/orders">Orders</Link>{user?.role === 'admin' && <Link to="/admin">Admin dashboard</Link>}{user && <button className="text-left text-red-600" onClick={() => dispatch(logout())}>Sign out</button>}</nav></div>}</header>
}
