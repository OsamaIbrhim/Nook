import { useDispatch } from 'react-redux'
import { Link } from 'react-router-dom'
import { errorMessage } from '../../../shared/http/errors'
import { mediaUrl } from '../../../shared/media/imageUrl'
import { EmptyState } from '../../../shared/ui/EmptyState'
import { PageError } from '../../../shared/ui/PageError'
import { QuantityStepper } from '../../../shared/ui/QuantityStepper'
import { useMoney } from '../../policy'
import { removeLine, setQuantity } from '../cartSlice'
import { CartNotices } from '../components/CartNotices'
import { QuoteTotals } from '../components/QuoteTotals'
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
          text="Browse the collection and add the objects you would like to keep."
          action={
            <Link className="btn-primary" to="/products">
              Shop the collection
            </Link>
          }
        />
      </div>
    )

  if (error && !quote)
    return (
      <div className="container-app py-14">
        <PageError message={errorMessage(error)} retry={refetch} />
      </div>
    )

  const priced = new Map(quote?.lines.map((line) => [line.productId, line]))
  const remaining = quote?.freeShippingRemaining ?? null

  return (
    <div className="container-app pb-(--section-gap) pt-10 sm:pt-14">
      <h1 className="text-h1 tracking-[-0.015em]">
        Your bag <span className="text-ink-subtle">({lines.length})</span>
      </h1>
      <div className="mt-6">
        <CartNotices notices={notices} currency={currency} onDismiss={dismissNotices} />
      </div>
      <div className="mt-4 grid gap-10 lg:grid-cols-12">
        <ul className="border-t border-line lg:col-span-8" aria-busy={isFetching}>
          {lines.map(({ productId, quantity }) => {
            const line = priced.get(productId)
            const stale = !line || line.requestedQuantity !== quantity
            const name = line?.name ?? 'this item'
            return (
              <li key={productId} className="flex gap-4 border-b border-line py-6">
                <div className="plate aspect-[4/5] w-24 shrink-0">
                  {line?.image && (
                    <img
                      className="h-full w-full object-cover"
                      src={mediaUrl(line.image.url)}
                      alt=""
                      width={192}
                      height={240}
                      loading="lazy"
                    />
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      {line?.category && <p className="eyebrow">{line.category.name}</p>}
                      {line?.slug ? (
                        <Link to={`/products/${line.slug}`} className="mt-1 block font-medium">
                          {line.name}
                        </Link>
                      ) : (
                        <div className="mt-1 h-5 w-40 bg-paper-sunken" />
                      )}
                    </div>
                    {line ? (
                      <p className={`shrink-0 tabular-nums ${stale ? 'opacity-50' : ''}`}>
                        {money(line.lineTotal, currency)}
                      </p>
                    ) : (
                      <div className="h-5 w-16 bg-paper-sunken" />
                    )}
                  </div>
                  <div className="mt-auto flex items-center justify-between gap-4 pt-4">
                    <QuantityStepper
                      itemName={name}
                      value={quantity}
                      max={line?.maxQuantity}
                      onChange={(next) => dispatch(setQuantity({ productId, quantity: next }))}
                    />
                    <button
                      type="button"
                      className="link-text min-h-11 text-sm"
                      aria-label={`Remove ${name} from your bag`}
                      onClick={() => dispatch(removeLine(productId))}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
        <aside className="h-fit bg-paper-sunken p-6 lg:sticky lg:top-[calc(var(--header-h)+1.5rem)] lg:col-span-4">
          <h2 className="text-title">Order summary</h2>
          <div className={`mt-6 ${isFetching ? 'opacity-60' : ''}`}>
            <QuoteTotals quote={quote} />
          </div>
          {remaining !== null && remaining > 0 && (
            <p className="mt-4 text-caption text-ink-muted">Add {money(remaining, currency)} more for free shipping.</p>
          )}
          {quote && !quote.checkoutAllowed ? (
            <button type="button" disabled className="btn-primary mt-6 w-full">
              Continue to checkout
            </button>
          ) : (
            <Link to="/checkout" className="btn-primary mt-6 w-full">
              Continue to checkout
            </Link>
          )}
          <p className="mt-3 text-center text-caption text-ink-subtle">Taxes calculated where applicable</p>
        </aside>
      </div>
    </div>
  )
}
