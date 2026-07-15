import { ArrowUpRight, Pause, Play } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

const slides = [
  { name: 'Ripple Ceramic Mug', category: 'Hand-finished stoneware', price: '$24', image: '/products/ripple-ceramic-mug.jpg', href: '/products/ripple-ceramic-mug', color: '#d7ff39' },
  { name: 'Glass Carafe Set', category: 'Borosilicate glass / set of three', price: '$48', image: '/products/glass-carafe-set.jpg', href: '/products/glass-carafe-set', color: '#ff7047' },
  { name: 'Oak Desk Tray', category: 'FSC-certified solid oak', price: '$42', image: '/products/oak-desk-tray.jpg', href: '/products/oak-desk-tray', color: '#8d7cff' }
]

export function HeroVisual() {
  const [active, setActive] = useState(0)
  const [playing, setPlaying] = useState(true)
  const panel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!playing || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const timer = window.setInterval(() => setActive((value) => (value + 1) % slides.length), 5000)
    return () => window.clearInterval(timer)
  }, [playing])

  const move = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!panel.current || event.pointerType === 'touch') return
    const bounds = panel.current.getBoundingClientRect()
    const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2
    const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2
    panel.current.style.setProperty('--hero-x', `${x * -10}px`)
    panel.current.style.setProperty('--hero-y', `${y * -10}px`)
  }
  const reset = () => {
    panel.current?.style.setProperty('--hero-x', '0px')
    panel.current?.style.setProperty('--hero-y', '0px')
  }

  return <div ref={panel} onPointerMove={move} onPointerLeave={reset} className="group relative h-full overflow-hidden bg-[#151513] [--hero-x:0px] [--hero-y:0px]">
    {slides.map((slide, index) => <div key={slide.name} aria-hidden={active !== index} className={`absolute inset-0 transition-[opacity,transform] duration-1000 ease-[cubic-bezier(.22,1,.36,1)] ${active === index ? 'z-[1] scale-100 opacity-100' : 'z-0 scale-[1.04] opacity-0'}`}>
      <img src={slide.image} alt={active === index ? `${slide.name} — ${slide.category}` : ''} className="h-full w-full scale-[1.06] object-cover transition-transform duration-700 ease-out will-change-transform [transform:translate3d(var(--hero-x),var(--hero-y),0)_scale(1.06)]" width="1024" height="1024" fetchPriority={index === 0 ? 'high' : 'auto'}/>
    </div>)}
    <div className="pointer-events-none absolute inset-0 z-[2] bg-[linear-gradient(180deg,rgba(4,4,4,.08)_20%,rgba(4,4,4,.05)_48%,rgba(4,4,4,.88)_100%)]"/>
    <div className="pointer-events-none absolute inset-0 z-[2] opacity-20 [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:48px_48px]"/>
    <Link to={slides[active].href} className="absolute inset-0 z-[3]" aria-label={`View ${slides[active].name}`}/>

    <div className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded-full border border-white/25 bg-black/35 px-3 py-2 text-[9px] font-black uppercase tracking-[.2em] text-white backdrop-blur-md"><span className="size-1.5 rounded-full" style={{ background: slides[active].color }}/> Live selection / 00{active + 1}</div>
    <button type="button" onClick={() => setPlaying((value) => !value)} className="absolute right-4 top-4 z-10 grid size-9 place-items-center rounded-full border border-white/25 bg-black/35 text-white backdrop-blur-md transition hover:bg-white hover:text-black" aria-label={playing ? 'Pause featured products' : 'Play featured products'}>{playing ? <Pause size={13}/> : <Play size={13}/>}</button>

    <div className="absolute inset-x-0 bottom-0 z-10 p-5 text-white sm:p-6">
      <div className="mb-5 flex gap-1.5" role="tablist" aria-label="Featured products">{slides.map((slide, index) => <button role="tab" aria-selected={active === index} aria-label={`Show ${slide.name}`} key={slide.name} onClick={() => setActive(index)} className="h-1 flex-1 overflow-hidden rounded-full bg-white/25"><span className={`block h-full origin-left transition-transform duration-500 ${active === index ? 'scale-x-100' : 'scale-x-0'}`} style={{ background: slide.color }}/></button>)}</div>
      <Link to={slides[active].href} className="group/link flex items-end justify-between gap-4">
        <div><p className="text-[9px] font-bold uppercase tracking-[.18em] text-white/55">{slides[active].category}</p><h2 className="mt-1 text-2xl font-black uppercase tracking-[-.035em] sm:text-3xl">{slides[active].name}</h2><p className="mt-1 text-sm font-bold">{slides[active].price}</p></div>
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-white text-black transition group-hover/link:rotate-45 group-hover/link:bg-[#d7ff39]"><ArrowUpRight size={19}/></span>
      </Link>
    </div>
  </div>
}
