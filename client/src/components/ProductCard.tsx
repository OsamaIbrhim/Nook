import { ShoppingBag } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAppDispatch } from '../app/hooks'
import { addToCart } from '../features/cart/cartSlice'
import type { Product } from '../types'
import { money } from '../utils/format'
import { toast } from 'sonner'
export function ProductCard({ product }: { product: Product }) {
  const dispatch = useAppDispatch()
  const add = () => { dispatch(addToCart({ product })); toast.success(`${product.name} added to your bag`) }
  return <article className="group overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5 transition hover:-translate-y-1 hover:shadow-xl">
    <Link to={`/products/${product.slug}`} className="block aspect-[4/5] overflow-hidden bg-[#eeeae0]">
      {product.images[0] ? <img src={product.images[0].url} alt={product.images[0].alt || product.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105"/> : <div className="grid h-full place-items-center text-sm text-black/35">No image</div>}
    </Link>
    <div className="p-4"><p className="mb-1 text-xs font-semibold uppercase tracking-widest text-forest/60">{product.category?.name}</p><Link to={`/products/${product.slug}`} className="line-clamp-1 font-bold hover:text-forest">{product.name}</Link><div className="mt-3 flex items-center justify-between"><div><span className="font-bold">{money(product.price)}</span>{product.compareAtPrice && <span className="ml-2 text-xs text-black/35 line-through">{money(product.compareAtPrice)}</span>}</div><button onClick={add} disabled={!product.stock} className="grid size-9 place-items-center rounded-full bg-mint text-forest transition hover:bg-forest hover:text-white disabled:opacity-40" aria-label={`Add ${product.name} to cart`}><ShoppingBag size={17}/></button></div></div>
  </article>
}
