import { Link, useParams } from 'react-router-dom'
import { errorMessage } from '../../../shared/http/errors'
import { mediaUrl } from '../../../shared/media/imageUrl'
import { PageError } from '../../../shared/ui/PageError'
import { Spinner } from '../../../shared/ui/Spinner'
import { StatusBadge } from '../../../shared/ui/StatusBadge'
import { useDate, useMoney } from '../../policy'
import { useGetOrderQuery } from '../api'

const row = 'flex justify-between gap-4'

export function OrderDetailPage() {
  const money = useMoney()
  const date = useDate()
  const { id = '' } = useParams()
  const { data: order, error, refetch } = useGetOrderQuery(id)

  if (error)
    return (
      <div className="container-app py-14">
        <PageError message={errorMessage(error)} retry={refetch} />
      </div>
    )
  if (!order) return <Spinner full />

  const address = order.shippingAddress
  const addressLines = [
    address.name,
    address.line1,
    address.line2,
    [address.city, address.state, address.postalCode].filter(Boolean).join(' '),
    address.country
  ].filter(Boolean)

  return (
    <div className="container-app pb-(--section-gap) pt-10 sm:pt-14">
      <Link to="/orders" className="link-text text-caption text-ink-muted">
        Your orders
      </Link>
      <p className="eyebrow mt-6">Order #{order.code}</p>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-h1 tracking-[-0.015em]">Order details</h1>
        <div className="flex gap-2">
          <StatusBadge value={order.paymentStatus} />
          <StatusBadge value={order.status} />
        </div>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-12">
        <section aria-label="Items" className="lg:col-span-7">
          <ul className="border-t border-line">
            {order.items.map((item) => (
              <li key={item.product} className="flex items-center gap-4 border-b border-line py-5">
                <div className="plate aspect-[4/5] w-20 shrink-0">
                  {item.image && (
                    <img
                      src={mediaUrl(item.image)}
                      alt=""
                      width={160}
                      height={200}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-ink-muted tabular-nums">
                    {money(item.unitPrice, order.currency)} × {item.quantity}
                  </p>
                </div>
                <p className="tabular-nums">{money(item.lineTotal, order.currency)}</p>
              </li>
            ))}
          </ul>
          <dl className="mt-6 space-y-3 text-sm tabular-nums">
            <div className={`${row} text-ink-muted`}>
              <dt>Subtotal</dt>
              <dd>{money(order.subtotal, order.currency)}</dd>
            </div>
            <div className={`${row} text-ink-muted`}>
              <dt>Shipping</dt>
              <dd>{order.shipping === 0 ? 'Free' : money(order.shipping, order.currency)}</dd>
            </div>
            <div className={`${row} border-t border-line pt-4 text-base font-medium`}>
              <dt>Total</dt>
              <dd>{money(order.total, order.currency)}</dd>
            </div>
          </dl>
        </section>

        <aside className="space-y-10 lg:col-span-4 lg:col-start-9">
          <section aria-labelledby="address-title">
            <h2 id="address-title" className="text-title">
              Delivery address
            </h2>
            <address className="mt-4 text-ink-muted not-italic">
              {addressLines.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </address>
          </section>
          <section aria-labelledby="timeline-title">
            <h2 id="timeline-title" className="text-title">
              Timeline
            </h2>
            <ol className="mt-4 border-t border-line">
              {order.statusHistory.map((entry, index) => (
                <li key={index} className={`${row} border-b border-line py-3 text-sm`}>
                  <span className="capitalize">{entry.status}</span>
                  <span className="text-ink-muted">{date(entry.at ?? order.createdAt)}</span>
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>
    </div>
  )
}
