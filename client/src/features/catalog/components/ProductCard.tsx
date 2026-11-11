import { Check, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { Link } from 'react-router-dom'
import type { Product } from '../../../shared/contract/types'
import { mediaUrl } from '../../../shared/media/imageUrl'
import { addLine } from '../../cart'
import { useMoney } from '../../policy'

const ADDED_FEEDBACK_MS = 1600

export function ProductCard({ product, eager = false }: { product: Product; eager?: boolean }) {
  const money = useMoney()
  const dispatch = useDispatch()
  const [added, setAdded] = useState(false)
  const image = product.images[0]
  const soldOut = product.stock <= 0
  const onSale = Boolean(product.compareAtPrice && product.compareAtPrice > product.price)

  useEffect(() => {
    if (!added) return
    const timer = window.setTimeout(() => setAdded(false), ADDED_FEEDBACK_MS)
    return () => window.clearTimeout(timer)
  }, [added])

  const add = () => {
    dispatch(addLine({ productId: product._id }))
    setAdded(true)
  }

  return (
    <article className="group relative">
      <div className="plate relative aspect-[4/5]">
        {image ? (
          <img
            src={mediaUrl(image.url)}
            alt={image.alt || product.name}
            width={800}
            height={1000}
            loading={eager ? 'eager' : 'lazy'}
            decoding="async"
            className={`h-full w-full object-cover object-[50%_55%] ${soldOut ? 'opacity-70' : ''}`}
          />
        ) : (
          <p className="grid h-full place-items-center text-caption text-ink-subtle">Image coming soon</p>
        )}
        {(soldOut || onSale) && (
          <span
            className={`absolute left-3 top-3 rounded-[2px] px-2 py-1 text-eyebrow font-medium uppercase ${soldOut ? 'bg-paper-raised text-ink' : 'bg-accent text-on-accent'}`}
          >
            {soldOut ? 'Sold out' : 'Sale'}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1 pt-3 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div className="min-w-0">
          <p className="eyebrow">{product.category.name}</p>
          <Link
            to={`/products/${product.slug}`}
            className="mt-1 block truncate text-sm font-medium after:absolute after:inset-0"
          >
            {product.name}
          </Link>
          {product.material && <p className="mt-0.5 truncate text-caption text-ink-subtle">{product.material}</p>}
        </div>
        <p className="shrink-0 text-sm tabular-nums sm:text-right">
          {onSale && product.compareAtPrice && <s className="mr-2 text-ink-subtle">{money(product.compareAtPrice)}</s>}
          <span className={onSale ? 'text-accent' : ''}>{money(product.price)}</span>
        </p>
      </div>
      {!soldOut && (
        <button
          type="button"
          onClick={add}
          aria-label={`Add ${product.name} to bag`}
          className="absolute right-3 top-0 z-10 mt-[calc(125%-3.5rem)] grid size-11 place-items-center border border-ink bg-paper-raised text-ink transition-opacity duration-(--dur-fast) focus-visible:opacity-100 pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100"
        >
          {added ? <Check size={20} strokeWidth={1.5} /> : <Plus size={20} strokeWidth={1.5} />}
        </button>
      )}
      <span role="status" className="sr-only">
        {added ? `${product.name} added to bag` : ''}
      </span>
    </article>
  )
}
