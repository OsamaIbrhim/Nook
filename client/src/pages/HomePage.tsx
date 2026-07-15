import { ArrowRight, MoveUpRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'

import { OutcomeHero } from '../components/OutcomeHero'
import { ProductCard } from '../components/ProductCard'
import { ProductGridSkeleton } from '../components/Skeletons'
import { Seo } from '../components/Seo'
import { siteUrl } from '../utils/site'
import type { ApiResponse, Product } from '../types'

const categories = [
  { index: '01', name: 'Objects for home', caption: 'Form, texture, atmosphere', query: 'Home' },
  { index: '02', name: 'Kitchen rituals', caption: 'Gather, prepare, share', query: 'Kitchen' },
  { index: '03', name: 'Workspace tools', caption: 'Focus without friction', query: 'Workspace' },
  { index: '04', name: 'Everyday wellness', caption: 'Slow down, tune in', query: 'Wellness' }
]

export function HomePage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    api.get<ApiResponse<{ products: Product[] }>>('/products?limit=4')
      .then((response) => setProducts(response.data.data.products))
      .finally(() => setLoading(false))
  }, [])

  const homeSchema = [
    { '@context': 'https://schema.org', '@type': 'Organization', '@id': `${siteUrl}/#organization`, name: 'Nook Objects', url: siteUrl, logo: `${siteUrl}/favicon.svg` },
    { '@context': 'https://schema.org', '@type': 'WebSite', '@id': `${siteUrl}/#website`, url: siteUrl, name: 'Nook Objects', publisher: { '@id': `${siteUrl}/#organization` }, potentialAction: { '@type': 'SearchAction', target: { '@type': 'EntryPoint', urlTemplate: `${siteUrl}/products?search={search_term_string}` }, 'query-input': 'required name=search_term_string' } }
  ]
  return <div className="overflow-hidden bg-[#090909] text-[#f3f1e9]">
    <Seo description="Shop a tightly curated collection of useful, distinctive objects for home, kitchen, workspace, and everyday wellness. Clear materials and straightforward returns." jsonLd={homeSchema}/>
    <OutcomeHero/>

    <section id="buying-standard" className="scroll-mt-28 bg-[#f2efe6] px-4 py-24 text-[#0a0a0a] sm:px-6 sm:py-36">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-12 lg:grid-cols-[220px_1fr]">
          <p className="pt-2 text-xs font-bold uppercase tracking-[.22em]">[ Our point of view ]</p>
          <div>
            <h2 className="text-[clamp(3.2rem,7.2vw,7.4rem)] font-semibold leading-[.93] tracking-[-.055em]">Things should do more than <span className="font-light italic text-black/35">exist.</span> They should change how a moment feels.</h2>
            <div className="mt-12 flex flex-col items-start justify-between gap-6 border-t border-black/20 pt-6 sm:flex-row sm:items-end"><p className="max-w-md text-sm leading-6 text-black/55">Nook brings gallery-level curation to everyday commerce. No noise. No endless aisles. Just objects with purpose, presence, and a story worth keeping.</p><Link to="/products" className="group flex items-center gap-3 text-sm font-bold uppercase tracking-widest">Enter the archive <span className="grid size-11 place-items-center rounded-full border border-black transition group-hover:bg-black group-hover:text-white"><ArrowRight size={17}/></span></Link></div>
          </div>
        </div>
      </div>
    </section>

    <section className="bg-[#090909] py-24 sm:py-32">
      <div className="container-app">
        <div className="mb-12 flex items-end justify-between border-b border-white/15 pb-6"><div><p className="text-xs font-bold uppercase tracking-[.25em] text-[#d7ff39]">Drop 001</p><h2 className="mt-2 text-4xl font-black tracking-[-.04em] sm:text-6xl">SELECTED OBJECTS</h2></div><Link to="/products" className="hidden items-center gap-2 text-xs font-bold uppercase tracking-widest sm:flex">View all <MoveUpRight size={17}/></Link></div>
        <div className="text-[#0a0a0a]">{loading ? <ProductGridSkeleton count={4}/> : <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">{products.map((product, index) => <div className={index % 2 ? 'sm:mt-16' : ''} key={product._id}><ProductCard product={product}/></div>)}</div>}</div>
      </div>
    </section>

    <section className="bg-[#6d63ff] py-24 text-black sm:py-32">
      <div className="container-app">
        <div className="mb-14 flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-[.24em]">Explore by atmosphere</p><p className="text-xs font-bold">04 / WORLDS</p></div>
        <div className="divide-y divide-black/30 border-y border-black/30">{categories.map((category) => <Link key={category.index} to={`/products?category=${category.query.toLowerCase()}`} className="group grid grid-cols-[50px_1fr_auto] items-center gap-3 py-6 transition hover:px-3 sm:grid-cols-[90px_1fr_240px_auto] sm:py-9"><span className="font-mono text-xs">{category.index}</span><span className="text-3xl font-black uppercase tracking-[-.04em] sm:text-6xl">{category.name}</span><span className="hidden text-sm text-black/55 sm:block">{category.caption}</span><span className="grid size-11 place-items-center rounded-full border border-black transition group-hover:-rotate-45 group-hover:bg-black group-hover:text-white"><ArrowRight size={18}/></span></Link>)}</div>
      </div>
    </section>

    <section className="relative grid min-h-[70vh] place-items-center overflow-hidden bg-[#ff5c35] px-4 py-24 text-center text-black">
      <div className="absolute left-[-8rem] top-[-8rem] size-72 rounded-full border-[40px] border-black/10 sm:size-96"/><div className="absolute bottom-[-4rem] right-[8%] size-48 rotate-45 bg-[#d7ff39] opacity-70"/>
      <div className="relative z-10"><p className="text-xs font-bold uppercase tracking-[.25em]">Your space is waiting</p><h2 className="mt-5 text-[clamp(3.6rem,9vw,9rem)] font-black leading-[.82] tracking-[-.07em]">FIND YOUR<br/>NEXT OBJECT.</h2><Link to="/products" className="mt-10 inline-flex items-center gap-3 rounded-full bg-black px-7 py-4 text-sm font-bold uppercase tracking-widest text-white transition hover:scale-105">Shop the collection <ArrowRight size={18}/></Link></div>
    </section>
  </div>
}
