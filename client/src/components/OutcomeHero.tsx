import { ArrowDown, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { HeroVisual } from './HeroVisual'

export function OutcomeHero() {
  return <section className="relative min-h-[820px] overflow-hidden bg-[#090909] text-[#f3f1e9] lg:h-[100svh] lg:min-h-[760px]" aria-labelledby="hero-title">
    <div className="pointer-events-none absolute inset-0 opacity-60 [background-image:linear-gradient(rgba(255,255,255,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.035)_1px,transparent_1px)] [background-size:64px_64px]"/>
    <div className="container-app relative z-10 grid min-h-[820px] items-center gap-12 pb-16 pt-40 lg:h-full lg:min-h-[760px] lg:grid-cols-[minmax(0,1fr)_minmax(420px,.78fr)] lg:gap-14 lg:pb-14 lg:pt-36 xl:gap-20">
      <div className="relative z-10 max-w-3xl">
        <div className="mb-7 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[.24em] text-[#d7ff39]"><span className="grid size-8 place-items-center rounded-full border border-[#d7ff39]/40"><Sparkles size={13}/></span>Curated for real life</div>
        <h1 id="hero-title" className="text-[clamp(3.7rem,7.2vw,7.8rem)] font-black leading-[.86] tracking-[-.065em]">Stop searching.<br/><span className="font-light italic text-white/72">Start living</span><br/>with better objects.</h1>
        <p className="mt-7 max-w-xl text-base leading-7 text-white/58 sm:text-lg sm:leading-8">Useful, distinctive pieces selected for how they feel, function, and transform your everyday space.</p>
        <div className="mt-9 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <Link to="/products" className="group inline-flex min-h-14 items-center justify-center gap-4 rounded-full bg-[#d7ff39] px-7 text-sm font-black uppercase tracking-[.12em] text-black transition hover:scale-[1.03] hover:bg-white">Shop the Collection <ArrowRight className="transition group-hover:translate-x-1" size={18}/></Link>
          <a href="#buying-standard" className="group inline-flex min-h-12 items-center gap-2 border-b border-white/35 text-xs font-bold uppercase tracking-[.14em] text-white transition hover:border-[#d7ff39] hover:text-[#d7ff39]">Why Nook chooses better <ArrowDown size={14}/></a>
        </div>
        <p className="mt-7 flex items-center gap-2 text-xs text-white/42"><ShieldCheck size={15} className="text-[#d7ff39]"/> Small collection. Clear materials. Straightforward returns.</p>
      </div>

      <div className="relative mx-auto h-[420px] w-full max-w-[620px] lg:h-[min(68vh,700px)] lg:max-w-none">
        <div className="absolute -inset-3 border border-white/8 sm:-inset-5"/>
        <div className="absolute -left-3 -top-3 z-20 size-8 border-l border-t border-[#d7ff39] sm:-left-5 sm:-top-5"/>
        <div className="absolute -bottom-3 -right-3 z-20 size-8 border-b border-r border-[#d7ff39] sm:-bottom-5 sm:-right-5"/>
        <div className="relative h-full overflow-hidden rounded-[2px] border border-white/15 bg-[#111] shadow-[0_35px_100px_rgba(0,0,0,.5)]">
          <HeroVisual/>
        </div>
      </div>
    </div>
    <div className="absolute bottom-0 z-20 hidden w-full border-t border-white/12 py-3 lg:block"><div className="container-app flex items-center justify-between text-[9px] font-bold uppercase tracking-[.25em] text-white/35"><span>Materials with a story</span><span>Scroll to discover</span><span>Objects with purpose</span></div></div>
  </section>
}
