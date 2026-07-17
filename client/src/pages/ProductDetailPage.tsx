import { Check, Minus, Plus, RotateCcw, ShieldCheck, ShoppingBag, Truck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { api, errorMessage } from '../api/client'
import { useAppDispatch } from '../app/hooks'
import { Seo } from '../components/Seo'
import { siteUrl } from '../utils/site'
import { Spinner } from '../components/Spinner'
import { addToCart } from '../features/cart/cartSlice'
import type { ApiResponse, Product } from '../types'
import { money } from '../utils/format'
import { absoluteMediaUrl, mediaUrl } from '../utils/media'

export function ProductDetailPage() {
  const { id } = useParams()
  const [product, setProduct] = useState<Product>()
  const [selected, setSelected] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [error, setError] = useState('')
  const dispatch = useAppDispatch()

  useEffect(() => {
    api.get<ApiResponse<{ product: Product }>>(`/products/${id}`)
      .then((response) => setProduct(response.data.data.product))
      .catch((reason) => setError(errorMessage(reason)))
  }, [id])

  if (error) return <div className="container-app py-20 text-center text-red-700">{error}</div>
  if (!product) return <Spinner full/>

  const path = `/products/${product.slug}`
  const description = product.seo?.description || product.shortDescription || product.description.slice(0, 165)
  const productSchema = [
    {
      '@context': 'https://schema.org',
      '@type': 'Product',
      '@id': `${siteUrl}${path}#product`,
      name: product.name,
      description,
      image: product.images.map((image) => absoluteMediaUrl(image.url)),
      sku: product.sku,
      brand: { '@type': 'Brand', name: product.brand || 'Nook Objects' },
      material: product.material,
      category: product.category.name,
      url: `${siteUrl}${path}`,
      offers: {
        '@type': 'Offer',
        url: `${siteUrl}${path}`,
        price: product.price.toFixed(2),
        priceCurrency: 'USD',
        availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        itemCondition: 'https://schema.org/NewCondition',
        seller: { '@type': 'Organization', name: 'Nook Objects' },
        hasMerchantReturnPolicy: { '@type': 'MerchantReturnPolicy', applicableCountry: 'EG', returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow', merchantReturnDays: 30, returnMethod: 'https://schema.org/ReturnByMail' },
        shippingDetails: { '@type': 'OfferShippingDetails', shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'EG' }, deliveryTime: { '@type': 'ShippingDeliveryTime', handlingTime: { '@type': 'QuantitativeValue', minValue: 1, maxValue: 2, unitCode: 'DAY' }, transitTime: { '@type': 'QuantitativeValue', minValue: 2, maxValue: 5, unitCode: 'DAY' } } }
      }
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
        { '@type': 'ListItem', position: 2, name: product.category.name, item: `${siteUrl}/products?category=${product.category.slug}` },
        { '@type': 'ListItem', position: 3, name: product.name, item: `${siteUrl}${path}` }
      ]
    }
  ]

  const add = () => {
    dispatch(addToCart({ product, quantity }))
    toast.success(`${product.name} added to your bag`)
  }

  return <>
    <Seo title={product.seo?.title || product.name} description={description} path={path} image={absoluteMediaUrl(product.images[0]?.url)} type="product" jsonLd={productSchema}/>
    <main className="bg-[#f2efe6] pb-24 text-black lg:pb-16">
      <div className="container-app py-6 sm:py-10">
        <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.16em] text-black/45"><Link to="/products">Collection</Link><span>/</span><Link to={`/products?category=${product.category.slug}`}>{product.category.name}</Link><span>/</span><span className="truncate text-black">{product.name}</span></nav>
        <div className="grid gap-9 lg:grid-cols-[minmax(0,1.18fr)_minmax(380px,.82fr)] lg:gap-14">
          <section aria-label="Product images" className="min-w-0">
            <div className="aspect-[4/5] overflow-hidden bg-[#dedbd2] sm:aspect-square">{product.images[selected] ? <img className="h-full w-full object-cover" src={mediaUrl(product.images[selected].url)} alt={product.images[selected].alt || `${product.name}, view ${selected + 1}`} width="1000" height="1000" fetchPriority="high"/> : <div className="grid h-full place-items-center text-sm uppercase tracking-widest text-black/35">Image coming soon</div>}</div>
            {product.images.length > 1 && <div className="mt-3 grid grid-cols-5 gap-2">{product.images.map((image, index) => <button key={image.publicId} onClick={() => setSelected(index)} aria-label={`View image ${index + 1} of ${product.name}`} aria-current={selected === index} className={`aspect-square overflow-hidden border-2 transition ${selected === index ? 'border-black' : 'border-transparent opacity-65 hover:opacity-100'}`}><img className="h-full w-full object-cover" src={mediaUrl(image.url)} alt="" loading="lazy"/></button>)}</div>}
          </section>

          <section className="lg:sticky lg:top-32 lg:h-fit lg:py-2">
            <p className="text-[10px] font-black uppercase tracking-[.2em] text-black/45">{product.category.name} / {product.sku || 'Nook edition'}</p>
            <h1 className="mt-3 text-[clamp(2.7rem,5vw,5.4rem)] font-black uppercase leading-[.88] tracking-[-.055em]">{product.name}</h1>
            <p className="mt-5 max-w-xl text-lg leading-7 text-black/58">{product.shortDescription || product.description}</p>
            <div className="mt-6 flex items-end gap-3"><span className="text-2xl font-black">{money(product.price)}</span>{product.compareAtPrice && <span className="pb-0.5 text-sm text-black/35 line-through">{money(product.compareAtPrice)}</span>}</div>

            {product.benefits?.length ? <ul className="mt-7 space-y-3 border-y border-black/15 py-6">{product.benefits.slice(0, 3).map((benefit) => <li className="flex gap-3 text-sm leading-6" key={benefit}><span className="mt-1 grid size-5 shrink-0 place-items-center rounded-full bg-[#d7ff39]"><Check size={12}/></span>{benefit}</li>)}</ul> : <p className="mt-7 border-y border-black/15 py-6 text-sm leading-6 text-black/60">{product.description}</p>}

            <div className="mt-6 flex items-center justify-between gap-4"><div className="flex h-12 items-center rounded-full border border-black/20 bg-white/45"><button aria-label="Decrease quantity" className="grid size-11 place-items-center" onClick={() => setQuantity(Math.max(1, quantity - 1))}><Minus size={15}/></button><span className="w-7 text-center text-sm font-black" aria-live="polite">{quantity}</span><button aria-label="Increase quantity" className="grid size-11 place-items-center" onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}><Plus size={15}/></button></div><p className={`text-xs font-bold ${product.stock > 0 && product.stock <= 4 ? 'text-red-600' : 'text-black/48'}`}>{product.stock <= 0 ? 'Currently unavailable' : product.stock <= 4 ? `Only ${product.stock} left` : 'In stock · Dispatches in 1–2 days'}</p></div>
            <button onClick={add} disabled={!product.stock} className="mt-4 flex min-h-14 w-full items-center justify-center gap-3 rounded-full bg-black px-6 text-sm font-black uppercase tracking-[.12em] text-white transition hover:bg-[#6d63ff] disabled:cursor-not-allowed disabled:opacity-45"><ShoppingBag size={18}/>{product.stock ? `Add to Bag — ${money(product.price * quantity)}` : 'Out of Stock'}</button>

            <div className="mt-5 grid grid-cols-3 gap-2 border-b border-black/15 pb-6 text-center text-[9px] font-bold uppercase tracking-wider text-black/55"><span className="flex flex-col items-center gap-2"><Truck size={17}/>Tracked delivery</span><span className="flex flex-col items-center gap-2"><RotateCcw size={17}/>30-day returns</span><span className="flex flex-col items-center gap-2"><ShieldCheck size={17}/>Secure checkout</span></div>

            <div className="divide-y divide-black/15 border-b border-black/15">{[
              ['Materials & dimensions', [product.material, product.dimensions].filter(Boolean).join(' · ') || 'Full specifications available from our product team.'],
              ['Care', product.care || 'Wipe clean with a soft, damp cloth. Follow the included care card for best results.'],
              ['Why Nook selected it', product.description]
            ].map(([title, content]) => <details className="group py-4" key={title}><summary className="flex cursor-pointer list-none items-center justify-between text-xs font-black uppercase tracking-[.13em]"><span>{title}</span><Plus className="transition group-open:rotate-45" size={16}/></summary><p className="max-w-lg pt-4 text-sm leading-6 text-black/58">{content}</p></details>)}</div>
          </section>
        </div>
      </div>
    </main>
    <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-3 border-t border-black/10 bg-[#f2efe6]/95 px-4 py-3 shadow-[0_-10px_35px_rgba(0,0,0,.12)] backdrop-blur lg:hidden"><div className="min-w-0"><p className="truncate text-[10px] font-black uppercase">{product.name}</p><p className="text-sm font-bold">{money(product.price)}</p></div><button onClick={add} disabled={!product.stock} className="min-h-12 shrink-0 rounded-full bg-black px-6 text-xs font-black uppercase tracking-widest text-white disabled:opacity-45">{product.stock ? `Add — ${money(product.price * quantity)}` : 'Out of stock'}</button></div>
  </>
}
