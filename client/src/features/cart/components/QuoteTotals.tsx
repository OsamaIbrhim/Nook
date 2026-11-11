import type { Quote } from '../../../shared/contract/types'
import { useMoney } from '../../policy'

const row = 'flex justify-between gap-4'

export function QuoteTotals({ quote }: { quote: Quote | undefined }) {
  const money = useMoney()
  if (!quote)
    return (
      <div className="space-y-3" aria-label="Loading totals">
        <div className="h-4 bg-paper-sunken" />
        <div className="h-4 bg-paper-sunken" />
        <div className="h-6 bg-paper-sunken" />
      </div>
    )
  return (
    <dl className="space-y-3 text-sm tabular-nums">
      <div className={`${row} text-ink-muted`}>
        <dt>Subtotal</dt>
        <dd>{money(quote.subtotal, quote.currency)}</dd>
      </div>
      <div className={`${row} text-ink-muted`}>
        <dt>Shipping</dt>
        <dd>{quote.shipping === 0 ? 'Free' : money(quote.shipping, quote.currency)}</dd>
      </div>
      <div className={`${row} border-t border-line pt-4 text-base font-medium`}>
        <dt>Total</dt>
        <dd>{money(quote.total, quote.currency)}</dd>
      </div>
    </dl>
  )
}
