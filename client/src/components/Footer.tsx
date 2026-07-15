import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'

export function Footer() {
  return <footer className="border-t border-white/15 bg-[#090909] px-4 pb-6 pt-20 text-white sm:px-6 sm:pt-28">
    <div className="mx-auto max-w-7xl">
      <div className="grid gap-12 lg:grid-cols-[1fr_420px]"><div><p className="text-[10px] font-bold uppercase tracking-[.25em] text-[#d7ff39]">Nook object store</p><p className="mt-5 text-[clamp(3.8rem,8vw,8rem)] font-black leading-[.78] tracking-[-.07em]">LIVE WITH<br/>INTENTION.</p></div><div className="flex flex-col justify-end"><p className="max-w-sm text-sm leading-6 text-white/50">A digital atelier for objects that bring character, calm, and utility to the spaces around you.</p><div className="mt-8 grid grid-cols-2 gap-6 border-t border-white/15 pt-6 text-xs font-bold uppercase tracking-widest"><div className="flex flex-col gap-3"><Link to="/products">Collection</Link><Link to="/orders">Orders</Link><Link to="/account">Account</Link></div><div className="flex flex-col gap-3"><a href="mailto:hello@nook.store" className="flex items-center gap-1">Contact <ArrowUpRight size={13}/></a><span className="text-white/35">Cairo, EG</span></div></div></div></div>
      <div className="mt-20 flex flex-wrap items-end justify-between gap-5 border-t border-white/15 pt-5 text-[9px] font-bold uppercase tracking-[.2em] text-white/35"><p>© {new Date().getFullYear()} Nook Objects</p><p>Secure commerce / Stripe protected</p><p>Designed for the curious</p></div>
    </div>
  </footer>
}
