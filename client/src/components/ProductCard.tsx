import { Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { useAppDispatch } from '../app/hooks'
import { addToCart } from '../features/cart/cartSlice'
import type { Product } from '../types'
import { money } from '../utils/format'
import { mediaUrl } from '../utils/media'

export function ProductCard({ product }: { product: Product }) {
  const dispatch = useAppDispatch()
  const add = () => {
    dispatch(addToCart({ product }))
    toast.success(`${product.name} added to your bag`)
  }
  return <article className="group relative">
    <Link to={`/products/${product.slug}`} className="relative block aspect-[4/5] overflow-hidden rounded-[2px] bg-[#d9d7cf]">
      {product.images[0] ? <img src={mediaUrl(product.images[0].url)} alt={product.images[0].alt || product.name} className="h-full w-full object-cover transition duration-700 ease-out group-hover:scale-[1.04]"/> : <div className="grid h-full place-items-center text-xs uppercase tracking-widest text-black/35">Image pending</div>}
      <span className="absolute left-3 top-3 rounded-full bg-black/75 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[.16em] text-white backdrop-blur">{product.stock ? 'Available' : 'Sold out'}</span>
      <button onClick={(event) => { event.preventDefault(); add() }} disabled={!product.stock} className="absolute bottom-3 right-3 grid size-11 translate-y-2 place-items-center rounded-full bg-[#d7ff39] text-black opacity-0 shadow-xl transition duration-300 hover:rotate-90 disabled:opacity-40 group-hover:translate-y-0 group-hover:opacity-100 focus:translate-y-0 focus:opacity-100" aria-label={`Add ${product.name} to cart`}><Plus size={20}/></button>
    </Link>
    <div className="flex items-start justify-between gap-3 border-t border-black/20 bg-[#f2efe6] px-1 pb-2 pt-3 text-black">
      <div className="min-w-0"><p className="text-[9px] font-bold uppercase tracking-[.18em] text-black/45">{product.category?.name || 'Nook object'}</p><Link to={`/products/${product.slug}`} className="mt-1 block truncate text-sm font-bold uppercase tracking-tight hover:underline">{product.name}</Link>{product.material && <p className="mt-1 truncate text-[10px] text-black/45">{product.material}</p>}</div>
      <div className="shrink-0 text-right"><span className="text-sm font-bold">{money(product.price)}</span>{product.compareAtPrice && <span className="block text-[10px] text-black/35 line-through">{money(product.compareAtPrice)}</span>}</div>
    </div>
  </article>
}
