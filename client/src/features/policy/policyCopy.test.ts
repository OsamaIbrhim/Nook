import { describe, expect, it } from 'vitest'
import type { ShopConfig } from '../../shared/contract/types'
import { announcementCopy, dispatchCopy, returnsCopy } from './policyCopy'

const policy: ShopConfig = {
  currency: 'egp',
  locale: 'en-US',
  freeShippingThreshold: 200,
  flatShippingRate: 50,
  returnWindowDays: 30,
  dispatchDaysMin: 1,
  dispatchDaysMax: 2,
  maxLineQuantity: 99,
  reservationMinutes: 35,
  supportEmail: 'hello@nook.store',
  shipsTo: ['EG']
}

describe('announcementCopy', () => {
  it('says free delivery starts AT the threshold, because the server charges nothing when the subtotal is 200 or more', () => {
    expect(announcementCopy(policy)).toBe('Free delivery on orders from EGP 200 — 30-day returns')
  })

  it('follows the policy: a 150 threshold and 14 days', () => {
    expect(announcementCopy({ ...policy, freeShippingThreshold: 150, returnWindowDays: 14 })).toBe(
      'Free delivery on orders from EGP 150 — 14-day returns'
    )
  })

  it('keeps a fractional threshold exact: 199.5 EGP', () => {
    expect(announcementCopy({ ...policy, freeShippingThreshold: 199.5 })).toContain('EGP 199.50')
  })

  it('leaves out the delivery clause when no order qualifies for free delivery', () => {
    expect(announcementCopy({ ...policy, freeShippingThreshold: null })).toBe('30-day returns')
  })

  it('leaves out the returns clause when returns are not offered', () => {
    expect(announcementCopy({ ...policy, returnWindowDays: 0 })).toBe('Free delivery on orders from EGP 200')
  })

  it('is empty when the policy offers neither', () => {
    expect(announcementCopy({ ...policy, freeShippingThreshold: null, returnWindowDays: 0 })).toBe('')
  })

  it('formats the amount with the policy currency and locale: dollars in en-US for usd', () => {
    expect(announcementCopy({ ...policy, currency: 'usd' })).toContain('$200')
  })
})

describe('returnsCopy', () => {
  it('names the window: 30-day returns, and 1-day returns', () => {
    expect(returnsCopy(30)).toBe('30-day returns')
    expect(returnsCopy(1)).toBe('1-day returns')
  })

  it('is empty for 0 days', () => {
    expect(returnsCopy(0)).toBe('')
  })
})

describe('dispatchCopy', () => {
  it('names a range with an en dash and a single value without one', () => {
    expect(dispatchCopy(1, 2)).toBe('1–2 days')
    expect(dispatchCopy(2, 2)).toBe('2 days')
    expect(dispatchCopy(1, 1)).toBe('1 day')
    expect(dispatchCopy(0, 0)).toBe('the same day')
  })
})
