import { Menu, Search, ShoppingBag, UserRound, X } from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { logout } from '../features/auth/authSlice'

export function Header() {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const { user } = useAppSelector((state) => state.auth)
  const count = useAppSelector((state) => state.cart.items.reduce((total, item) => total + item.quantity, 0))
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const onHome = location.pathname === '/'
  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    navigate(`/products?search=${encodeURIComponent(search)}`)
    setOpen(false)
  }
  const navClass = ({ isActive }: { isActive: boolean }) => `relative text-[11px] font-bold uppercase tracking-[.18em] transition after:absolute after:-bottom-2 after:left-0 after:h-px after:bg-current after:transition-all ${isActive ? 'after:w-full' : 'after:w-0 hover:after:w-full'}`
  const theme = onHome ? 'absolute border-white/12 bg-transparent text-white' : 'sticky border-black/10 bg-[#f2efe6]/92 text-black backdrop-blur-xl'

  return <header className={`inset-x-0 top-0 z-40 border-b ${theme}`}>
    <div className="container-app flex h-20 items-center justify-between gap-6">
      <Link to="/" className="flex items-center text-xl font-black uppercase tracking-[-.05em]" aria-label="Nook home">NOOK<span className="text-[#d7ff39]">●</span></Link>
      <nav className="hidden items-center gap-9 md:flex"><NavLink to="/products" className={navClass}>Collection</NavLink><NavLink to="/orders" className={navClass}>Orders</NavLink>{user?.role === 'admin' && <NavLink to="/admin" className={navClass}>Control room</NavLink>}</nav>
      <form onSubmit={submit} className="hidden max-w-[280px] flex-1 lg:flex"><div className="relative w-full"><Search className={`absolute left-0 top-1/2 -translate-y-1/2 ${onHome ? 'text-white/45' : 'text-black/40'}`} size={15}/><input aria-label="Search products" value={search} onChange={(event) => setSearch(event.target.value)} className={`w-full border-b bg-transparent py-2 pl-7 text-xs outline-none placeholder:text-current/40 ${onHome ? 'border-white/25 focus:border-[#d7ff39]' : 'border-black/20 focus:border-black'}`} placeholder="SEARCH THE ARCHIVE"/></div></form>
      <div className="flex items-center gap-1">
        <Link to={user ? '/account' : '/login'} className="grid size-10 place-items-center rounded-full transition hover:bg-current/10" aria-label="Account"><UserRound size={19}/></Link>
        <Link to="/cart" className="relative grid size-10 place-items-center rounded-full transition hover:bg-current/10" aria-label={`Shopping bag with ${count} items`}><ShoppingBag size={19}/>{count > 0 && <span className="absolute right-0 top-0 grid size-5 place-items-center rounded-full bg-[#d7ff39] text-[9px] font-black text-black">{count}</span>}</Link>
        <button onClick={() => setOpen(!open)} className="grid size-10 place-items-center md:hidden" aria-label="Toggle menu">{open ? <X/> : <Menu/>}</button>
      </div>
    </div>
    {open && <div className="border-t border-white/10 bg-[#0a0a0a] px-4 py-6 text-white md:hidden"><form onSubmit={submit} className="mb-7"><input value={search} onChange={(event) => setSearch(event.target.value)} className="w-full border-b border-white/25 bg-transparent py-3 text-base outline-none" placeholder="Search products"/></form><nav className="flex flex-col gap-5 text-2xl font-black uppercase"><Link onClick={() => setOpen(false)} to="/products">Collection</Link><Link onClick={() => setOpen(false)} to="/orders">Orders</Link>{user?.role === 'admin' && <Link onClick={() => setOpen(false)} to="/admin">Control room</Link>}{user && <button className="mt-3 text-left text-sm text-[#ff5c35]" onClick={() => dispatch(logout())}>Sign out</button>}</nav></div>}
  </header>
}
