import { describe, expect, it } from 'vitest'
import type { Quote, QuoteLine } from '../../shared/contract/types'
import { reconcileCart, rememberPrices } from './reconcile'

const MUG = 'a1'.repeat(12)
const LAMP = 'b2'.repeat(12)

const quoteLine = (overrides: Partial<QuoteLine> & { productId: string }): QuoteLine => ({
  slug: 'ripple-mug',
  name: 'Ripple Mug',
  image: null,
  category: null,
  unitPrice: 24,
  compareAtPrice: null,
  requestedQuantity: 2,
  quantity: 2,
  maxQuantity: 5,
  lineTotal: 48,
  status: 'ok',
  issue: null,
  ...overrides
})
const quoteOf = (...lines: QuoteLine[]): Quote => ({
  currency: 'egp',
  lines,
  subtotal: 0,
  shipping: 0,
  total: 0,
  freeShippingThreshold: 200,
  freeShippingRemaining: 200,
  checkoutAllowed: true
})

describe('reconcileCart', () => {
  it('changes nothing and reports nothing when every line is fine', () => {
    const lines = [{ productId: MUG, quantity: 2 }]
    expect(reconcileCart(lines, quoteOf(quoteLine({ productId: MUG })), new Map())).toEqual({ lines, notices: [] })
  })

  it('lowers a line to what the server can supply and says why: asked 3, stock allows 2', () => {
    const result = reconcileCart(
      [{ productId: MUG, quantity: 3 }],
      quoteOf(
        quoteLine({
          productId: MUG,
          requestedQuantity: 3,
          quantity: 2,
          maxQuantity: 2,
          status: 'adjusted',
          issue: 'stock_reduced'
        })
      ),
      new Map()
    )
    expect(result.lines).toEqual([{ productId: MUG, quantity: 2 }])
    expect(result.notices).toEqual([
      { kind: 'reduced', productId: MUG, name: 'Ripple Mug', from: 3, to: 2, issue: 'stock_reduced' }
    ])
  })

  it('removes a line that is no longer for sale and keeps the others', () => {
    const result = reconcileCart(
      [
        { productId: MUG, quantity: 1 },
        { productId: LAMP, quantity: 1 }
      ],
      quoteOf(
        quoteLine({
          productId: MUG,
          requestedQuantity: 1,
          quantity: 0,
          unitPrice: null,
          lineTotal: 0,
          status: 'unavailable',
          issue: 'out_of_stock'
        }),
        quoteLine({
          productId: LAMP,
          name: 'Arc Lamp',
          requestedQuantity: 1,
          quantity: 1,
          lineTotal: 99.5,
          unitPrice: 99.5
        })
      ),
      new Map()
    )
    expect(result.lines).toEqual([{ productId: LAMP, quantity: 1 }])
    expect(result.notices).toEqual([{ kind: 'removed', productId: MUG, name: 'Ripple Mug', issue: 'out_of_stock' }])
  })

  it('reports an item the server will not describe (inactive or unknown) without a name', () => {
    const result = reconcileCart(
      [{ productId: MUG, quantity: 1 }],
      quoteOf(
        quoteLine({
          productId: MUG,
          name: null,
          slug: null,
          requestedQuantity: 1,
          quantity: 0,
          unitPrice: null,
          lineTotal: 0,
          status: 'unavailable',
          issue: 'inactive'
        })
      ),
      new Map()
    )
    expect(result.notices).toEqual([{ kind: 'removed', productId: MUG, name: null, issue: 'inactive' }])
  })

  it('reports a price change against the price seen earlier: 24 became 26', () => {
    const result = reconcileCart(
      [{ productId: MUG, quantity: 2 }],
      quoteOf(quoteLine({ productId: MUG, unitPrice: 26, lineTotal: 52 })),
      new Map([[MUG, 24]])
    )
    expect(result.lines).toEqual([{ productId: MUG, quantity: 2 }])
    expect(result.notices).toEqual([{ kind: 'price_changed', productId: MUG, name: 'Ripple Mug', from: 24, to: 26 }])
  })

  it('says nothing about price when none was seen before or the price is the same', () => {
    const quote = quoteOf(quoteLine({ productId: MUG }))
    expect(reconcileCart([{ productId: MUG, quantity: 2 }], quote, new Map()).notices).toEqual([])
    expect(reconcileCart([{ productId: MUG, quantity: 2 }], quote, new Map([[MUG, 24]])).notices).toEqual([])
  })

  it('ignores a quote that answered an older quantity: the user already changed it, a newer quote is coming', () => {
    const lines = [{ productId: MUG, quantity: 4 }]
    const stale = quoteOf(
      quoteLine({ productId: MUG, requestedQuantity: 3, quantity: 2, status: 'adjusted', issue: 'stock_reduced' })
    )
    expect(reconcileCart(lines, stale, new Map())).toEqual({ lines, notices: [] })
  })

  it('keeps a stored line the quote does not mention', () => {
    const lines = [{ productId: MUG, quantity: 1 }]
    expect(reconcileCart(lines, quoteOf(), new Map())).toEqual({ lines, notices: [] })
  })

  it('reports a quantity cap as quantity_capped', () => {
    const result = reconcileCart(
      [{ productId: MUG, quantity: 150 }],
      quoteOf(
        quoteLine({
          productId: MUG,
          requestedQuantity: 150,
          quantity: 99,
          maxQuantity: 99,
          status: 'adjusted',
          issue: 'quantity_capped'
        })
      ),
      new Map()
    )
    expect(result.notices[0]).toMatchObject({ kind: 'reduced', from: 150, to: 99, issue: 'quantity_capped' })
  })
})

describe('rememberPrices', () => {
  it('records the unit price of every purchasable line and forgets lines the quote no longer prices', () => {
    const prices = new Map([[LAMP, 10]])
    rememberPrices(
      quoteOf(
        quoteLine({ productId: MUG, unitPrice: 24 }),
        quoteLine({ productId: LAMP, unitPrice: null, quantity: 0, status: 'unavailable', issue: 'out_of_stock' })
      ),
      prices
    )
    expect([...prices]).toEqual([[MUG, 24]])
  })
})
