import type { Quote, QuoteLine } from '../../shared/contract/types'
import type { CartLine } from './cartLines'

type Issue = NonNullable<QuoteLine['issue']>
export type CartNotice =
  | { kind: 'reduced'; productId: string; name: string | null; from: number; to: number; issue: Issue }
  | { kind: 'removed'; productId: string; name: string | null; issue: Issue }
  | { kind: 'price_changed'; productId: string; name: string | null; from: number; to: number }

export function reconcileCart(lines: CartLine[], quote: Quote, knownPrices: Map<string, number>) {
  const byId = new Map(quote.lines.map((line) => [line.productId, line]))
  const kept: CartLine[] = []
  const notices: CartNotice[] = []
  for (const line of lines) {
    const priced = byId.get(line.productId)
    if (!priced || priced.requestedQuantity !== line.quantity) {
      kept.push(line)
      continue
    }
    const { productId, name } = priced
    if (priced.status === 'unavailable') {
      notices.push({ kind: 'removed', productId, name, issue: priced.issue! })
      continue
    }
    kept.push(priced.status === 'adjusted' ? { productId, quantity: priced.quantity } : line)
    if (priced.status === 'adjusted') {
      notices.push({ kind: 'reduced', productId, name, from: line.quantity, to: priced.quantity, issue: priced.issue! })
    }
    const before = knownPrices.get(productId)
    if (before !== undefined && priced.unitPrice !== null && before !== priced.unitPrice) {
      notices.push({ kind: 'price_changed', productId, name, from: before, to: priced.unitPrice })
    }
  }
  return { lines: kept, notices }
}

export function rememberPrices(quote: Quote, prices: Map<string, number>) {
  for (const line of quote.lines) {
    if (line.unitPrice === null) prices.delete(line.productId)
    else prices.set(line.productId, line.unitPrice)
  }
}
