import { Menu, Search, ShoppingBag, UserRound, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { logout } from '../features/auth/authSlice'

const categories = [
  ['New Objects', '/products?sort=newest'],
  ['Home', '/products?category=home'],
  ['Kitchen', '/products?category=kitchen'],
  ['Workspace', '/products?category=workspace'],
  ['Wellness', '/products?category=wellness']
]

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [scrolled, setScrolled] = useState(false)
  const [visible, setVisible] = useState(true)
  const lastScrollY = useRef(0)
  const { user } = useAppSelector((state) => state.auth)
  const cartCount = useAppSelector((state) => state.cart.items.reduce((total, item) => total + item.quantity, 0))
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const onHome = location.pathname === '/'

  useEffect(() => {
    const update = () => {
      const current = window.scrollY
      setScrolled(current > 80)
      if (current < 120) setVisible(true)
      else if (Math.abs(current - lastScrollY.current) > 8) setVisible(current < lastScrollY.current)
      lastScrollY.current = current
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [])

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname, location.search])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    const close = (event: KeyboardEvent) => event.key === 'Escape' && setMenuOpen(false)
    window.addEventListener('keydown', close)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', close)
    }
  }, [menuOpen])

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault()
    const value = search.trim()
    navigate(value ? `/products?search=${encodeURIComponent(value)}` : '/products')
    setMenuOpen(false)
  }

  const transparent = onHome && !scrolled && !menuOpen
  const headerTheme = transparent ? 'border-white/12 bg-transparent text-white' : 'border-black/10 bg-[#f2efe6]/95 text-black shadow-[0_6px_30px_rgba(0,0,0,.06)] backdrop-blur-xl'
  const navClass = ({ isActive }: { isActive: boolean }) => `relative py-2 text-[10px] font-black uppercase tracking-[.17em] transition after:absolute after:bottom-0 after:left-0 after:h-px after:bg-current after:transition-all ${isActive ? 'after:w-full' : 'after:w-0 hover:after:w-full'}`

  return <>
    <a href="#main-content" className="fixed left-3 top-3 z-[100] -translate-y-24 rounded-full bg-[#d7ff39] px-4 py-2 text-xs font-black text-black transition focus:translate-y-0">Skip to content</a>
    <header className={`fixed inset-x-0 top-0 z-50 border-b transition-[transform,background-color,border-color,box-shadow] duration-300 ${visible || menuOpen ? 'translate-y-0' : '-translate-y-full'} ${headerTheme}`}>
      <div className={`border-b py-1.5 text-center text-[9px] font-bold uppercase tracking-[.18em] ${transparent ? 'border-white/10 bg-white/[.03] text-white/70' : 'border-black/8 bg-black text-white'}`}>
        <Link to="/products" className="transition hover:text-[#d7ff39]">Complimentary delivery on orders over $100 <span className="mx-2 opacity-40">—</span> 30-day returns</Link>
      </div>
      <div className="container-app flex h-17 items-center justify-between gap-6">
        <Link to="/" className="flex shrink-0 items-center text-xl font-black uppercase tracking-[-.055em]" aria-label="Nook home">NOOK<span className="text-[#d7ff39] drop-shadow-[0_0_8px_rgba(215,255,57,.35)]">●</span></Link>
        <nav aria-label="Primary navigation" className="hidden items-center gap-7 xl:flex">{categories.map(([label, path]) => <NavLink key={label} to={path} className={navClass}>{label}</NavLink>)}</nav>
        <form onSubmit={submitSearch} role="search" className="hidden max-w-[250px] flex-1 lg:block xl:max-w-[220px]"><div className="relative"><Search className="absolute left-0 top-1/2 -translate-y-1/2 opacity-45" size={15}/><input aria-label="Search products" value={search} onChange={(event) => setSearch(event.target.value)} className={`w-full border-b bg-transparent py-2 pl-7 text-xs outline-none placeholder:opacity-45 ${transparent ? 'border-white/25 focus:border-[#d7ff39]' : 'border-black/20 focus:border-black'}`} placeholder="What are you looking for?"/></div></form>
        <div className="flex items-center gap-0.5">
          {user?.role === 'admin' && <Link to="/admin" className="mr-2 hidden text-[9px] font-black uppercase tracking-widest lg:block">Control room</Link>}
          <Link to={user ? '/account' : '/login'} className="grid size-11 place-items-center rounded-full transition hover:bg-current/10" aria-label={user ? 'Open account' : 'Sign in'}><UserRound size={19}/></Link>
          <Link to="/cart" className="relative grid size-11 place-items-center rounded-full transition hover:bg-current/10" aria-label={`Shopping bag with ${cartCount} items`}><ShoppingBag size={19}/>{cartCount > 0 && <span className="absolute right-0.5 top-0.5 grid size-5 place-items-center rounded-full bg-[#d7ff39] text-[9px] font-black text-black">{cartCount}</span>}</Link>
          <button type="button" onClick={() => setMenuOpen((value) => !value)} className="grid size-11 place-items-center xl:hidden" aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={menuOpen} aria-controls="mobile-menu">{menuOpen ? <X/> : <Menu/>}</button>
        </div>
      </div>
    </header>

    <div id="mobile-menu" className={`fixed inset-0 z-40 bg-[#0a0a0a] px-4 pb-8 pt-32 text-white transition duration-500 xl:hidden ${menuOpen ? 'visible translate-y-0 opacity-100' : 'invisible -translate-y-5 opacity-0'}`} aria-hidden={!menuOpen}>
      <div className="container-app flex h-full flex-col">
        <form onSubmit={submitSearch} role="search" className="relative mb-8"><Search className="absolute left-0 top-1/2 -translate-y-1/2 text-white/40"/><input tabIndex={menuOpen ? 0 : -1} aria-label="Search products" value={search} onChange={(event) => setSearch(event.target.value)} className="w-full border-b border-white/25 bg-transparent py-4 pl-9 pr-2 text-lg outline-none placeholder:text-white/35 focus:border-[#d7ff39]" placeholder="What are you looking for?"/></form>
        <nav aria-label="Mobile navigation" className="divide-y divide-white/12 border-y border-white/12">{categories.map(([label, path], index) => <Link tabIndex={menuOpen ? 0 : -1} key={label} to={path} className="group flex items-center justify-between py-4 sm:py-5"><span className="text-[clamp(1.7rem,7vw,3rem)] font-black uppercase tracking-[-.04em]">{label}</span><span className="font-mono text-[10px] text-white/35">0{index + 1}</span></Link>)}</nav>
        <div className="mt-auto flex items-end justify-between pt-8 text-[10px] font-bold uppercase tracking-[.18em] text-white/40"><div className="space-y-3"><Link className="block text-white" to="/orders">Orders</Link>{user?.role === 'admin' && <Link className="block text-[#d7ff39]" to="/admin">Control room</Link>}{user && <button tabIndex={menuOpen ? 0 : -1} className="block uppercase text-[#ff5c35]" onClick={() => dispatch(logout())}>Sign out</button>}</div><p className="text-right">Curated objects<br/>Cairo — Worldwide</p></div>
      </div>
    </div>
  </>
}
