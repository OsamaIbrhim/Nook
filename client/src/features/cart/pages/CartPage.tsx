import { Minus, Plus, Trash2 } from 'lucide-react'
import { useDispatch } from 'react-redux'
import { Link } from 'react-router-dom'
import { useMoney } from '../../policy'
import { errorMessage } from '../../../shared/http/errors'
import { mediaUrl } from '../../../shared/media/imageUrl'
import { EmptyState } from '../../../shared/ui/EmptyState'
import { PageError } from '../../../shared/ui/PageError'
import { removeLine, setQuantity } from '../cartSlice'
import { CartNotices } from '../components/CartNotices'
import { useCartQuote } from '../useCartQuote'

export function CartPage() {
  const money = useMoney()
  const dispatch = useDispatch()
  const { lines, quote, isFetching, error, refetch, notices, dismissNotices } = useCartQuote()
  const currency = quote?.currency ?? ''

  if (!lines.length)
    return (
      <div className="container-app py-14">
        <CartNotices notices={notices} currency={currency} onDismiss={dismissNotices} />
        <EmptyState
          title="Your bag is empty"
          text="Good things are waiting. Browse the collection and find something you love."
          action={
            <Link className="btn-primary" to="/products">
              Start shopping
            </Link>
          }
        />
      </div>
    )

  if (error && !quote)
    return (
      <div className="container-app py-10">
        <PageError message={errorMessage(error)} retry={refetch} />
      </div>
    )

  const priced = new Map(quote?.lines.map((line) => [line.productId, line]))
  const remaining = quote?.freeShippingRemaining ?? null

  return (
    <div className="container-app py-10">
      <h1 className="mb-8 text-4xl font-black tracking-tight">
        Your bag <span className="text-black/25">({lines.length})</span>
      </h1>
      <CartNotices notices={notices} currency={currency} onDismiss={dismissNotices} />
      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="card divide-y divide-black/5 px-5" aria-busy={isFetching}>
          {lines.map(({ productId, quantity }) => {
            const line = priced.get(productId)
            const stale = !line || line.requestedQuantity !== quantity
            const name = line?.name ?? 'this item'
            return (
              <div key={productId} className="flex gap-4 py-5">
                {line?.slug ? (
                  <Link to={`/products/${line.slug}`} className="size-24 shrink-0 overflow-hidden rounded-xl bg-cream">
                    {line.image && <img className="h-full w-full object-cover" src={mediaUrl(line.image.url)} alt="" />}
                  </Link>
                ) : (
                  <div className="size-24 shrink-0 animate-pulse rounded-xl bg-cream" />
                )}
                <div className="min-w-0 flex-1">
                  {line?.slug ? (
                    <Link to={`/products/${line.slug}`} className="font-bold">
                      {line.name}
                    </Link>
                  ) : (
                    <div className="h-5 w-40 animate-pulse rounded bg-black/8" />
                  )}
                  {line?.category && <p className="mt-1 text-sm text-black/45">{line.category.name}</p>}
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center rounded-full border border-black/10">
                      <button
                        className="p-2"
                        aria-label={`Decrease quantity of ${name}`}
                        disabled={quantity <= 1}
                        onClick={() => dispatch(setQuantity({ productId, quantity: quantity - 1 }))}
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-7 text-center text-xs font-bold" aria-label={`Quantity of ${name}`}>
                        {quantity}
                      </span>
                      <button
                        className="p-2"
                        aria-label={`Increase quantity of ${name}`}
                        disabled={!!line && quantity >= line.maxQuantity}
                        onClick={() => dispatch(setQuantity({ productId, quantity: quantity + 1 }))}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <button
                      className="text-black/35 hover:text-red-600"
                      aria-label={`Remove ${name} from your bag`}
                      onClick={() => dispatch(removeLine(productId))}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
                {line ? (
                  <b className={stale ? 'opacity-50' : ''}>{money(line.lineTotal, currency)}</b>
                ) : (
                  <div className="h-5 w-16 animate-pulse rounded bg-black/8" />
                )}
              </div>
            )
          })}
        </div>
        <aside className="card h-fit p-6">
          <h2 className="text-xl font-bold">Order summary</h2>
          {quote ? (
            <div className={`mt-6 space-y-3 text-sm ${isFetching ? 'opacity-60' : ''}`}>
              <div className="flex justify-between text-black/55">
                <span>Subtotal</span>
                <span>{money(quote.subtotal, currency)}</span>
              </div>
              <div className="flex justify-between text-black/55">
                <span>Shipping</span>
                <span>{quote.shipping === 0 ? 'Free' : money(quote.shipping, currency)}</span>
              </div>
              {remaining !== null && remaining > 0 && (
                <p className="text-xs text-black/55">Add {money(remaining, currency)} more for free shipping.</p>
              )}
              <div className="flex justify-between border-t border-black/8 pt-4 text-lg font-bold">
                <span>Total</span>
                <span>{money(quote.total, currency)}</span>
              </div>
            </div>
          ) : (
            <div className="mt-6 space-y-3" aria-label="Loading totals">
              <div className="h-4 animate-pulse rounded bg-black/8" />
              <div className="h-4 animate-pulse rounded bg-black/8" />
              <div className="h-6 animate-pulse rounded bg-black/8" />
            </div>
          )}
          {quote && !quote.checkoutAllowed ? (
            <button disabled className="btn-primary mt-6 w-full">
              Continue to checkout
            </button>
          ) : (
            <Link to="/checkout" className="btn-primary mt-6 w-full">
              Continue to checkout
            </Link>
          )}
          <p className="mt-3 text-center text-xs text-black/40">Taxes calculated where applicable</p>
        </aside>
      </div>
    </div>
  )
}
