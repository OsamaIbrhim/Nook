import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { errorMessage } from '../../../shared/http/errors'
import { mediaUrl } from '../../../shared/media/imageUrl'
import { EmptyState } from '../../../shared/ui/EmptyState'
import { PageError } from '../../../shared/ui/PageError'
import { Spinner } from '../../../shared/ui/Spinner'
import { StatusBadge } from '../../../shared/ui/StatusBadge'
import { useStartPayment } from '../../checkout'
import { useDate, useMoney } from '../../policy'
import { useListMyOrdersQuery } from '../api'

const MAX_THUMBNAILS = 4

export function OrdersPage() {
  const money = useMoney()
  const date = useDate()
  const { data: orders = [], isLoading, error, refetch } = useListMyOrdersQuery()
  const startPayment = useStartPayment()

  const pay = async (id: string) => {
    try {
      await startPayment(id)
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  if (isLoading) return <Spinner full />
  if (error)
    return (
      <div className="container-app py-14">
        <PageError message={errorMessage(error)} retry={refetch} />
      </div>
    )
  if (!orders.length)
    return (
      <div className="container-app py-14">
        <EmptyState
          title="No orders yet"
          text="When you place an order, you can follow it here."
          action={
            <Link to="/products" className="btn-primary">
              Shop the collection
            </Link>
          }
        />
      </div>
    )

  return (
    <div className="container-app pb-(--section-gap) pt-10 sm:pt-14">
      <h1 className="text-h1 tracking-[-0.015em]">Your orders</h1>
      <ul className="mt-10 border-t border-line">
        {orders.map((order) => {
          const itemCount = order.items.reduce((total, item) => total + item.quantity, 0)
          return (
            <li key={order._id} className="grid gap-5 border-b border-line py-6 md:grid-cols-12 md:items-center">
              <div className="md:col-span-3">
                <p className="eyebrow">Order #{order.code}</p>
                <p className="mt-1 font-medium">{date(order.createdAt)}</p>
              </div>
              <div className="flex gap-2 md:col-span-3">
                {order.items.slice(0, MAX_THUMBNAILS).map((item) => (
                  <div key={item.product} className="plate aspect-[4/5] w-12">
                    {item.image && (
                      <img
                        src={mediaUrl(item.image)}
                        alt={item.name}
                        width={96}
                        height={120}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 md:col-span-2">
                <StatusBadge value={order.paymentStatus} />
                <StatusBadge value={order.status} />
              </div>
              <p className="tabular-nums md:col-span-2 md:text-right">
                {money(order.total, order.currency)}
                <span className="block text-caption text-ink-subtle">
                  {itemCount} {itemCount === 1 ? 'item' : 'items'}
                </span>
              </p>
              <div className="flex flex-wrap gap-4 md:col-span-2 md:justify-end">
                {order.actions.canPay && (
                  <button type="button" onClick={() => pay(order._id)} className="link-text min-h-11 text-sm">
                    Resume payment
                  </button>
                )}
                <Link
                  to={`/orders/${order._id}`}
                  className="link-text flex min-h-11 items-center text-sm"
                  aria-label={`View order #${order.code}`}
                >
                  View
                </Link>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
