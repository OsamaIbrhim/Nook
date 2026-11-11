import { useMoney } from '../../policy'
import type { CartNotice } from '../reconcile'

type Money = (value: number, currency?: string) => string

function describe(notice: CartNotice, currency: string, money: Money) {
  const name = notice.name ?? 'An item in your bag'
  if (notice.kind === 'price_changed') {
    return `The price of ${name} changed from ${money(notice.from, currency)} to ${money(notice.to, currency)}.`
  }
  if (notice.kind === 'removed') {
    return notice.issue === 'out_of_stock'
      ? `${name} is out of stock and was removed from your bag.`
      : 'An item in your bag is no longer available and was removed.'
  }
  return notice.issue === 'quantity_capped'
    ? `${name} is limited to ${notice.to} per order, so we updated your bag.`
    : `Only ${notice.to} of ${name} ${notice.to === 1 ? 'is' : 'are'} available, so we updated your bag.`
}

export function CartNotices({
  notices,
  currency,
  onDismiss
}: {
  notices: CartNotice[]
  currency: string
  onDismiss: () => void
}) {
  const money = useMoney()
  if (!notices.length) return null
  return (
    <div role="status" className="mb-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
      <ul className="space-y-1">
        {notices.map((notice, index) => (
          <li key={`${notice.productId}-${notice.kind}-${index}`}>{describe(notice, currency, money)}</li>
        ))}
      </ul>
      <button type="button" onClick={onDismiss} className="mt-3 text-xs font-bold underline">
        Dismiss
      </button>
    </div>
  )
}
