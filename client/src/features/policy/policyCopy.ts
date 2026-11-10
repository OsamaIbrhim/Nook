import type { ShopConfig } from '../../shared/contract/types'
import { formatMoney } from '../../shared/format/money'

export const returnsCopy = (days: number) => (days > 0 ? `${days}-day returns` : '')

export function dispatchCopy(min: number, max: number) {
  if (min === 0 && max === 0) return 'the same day'
  if (min === max) return `${min} ${min === 1 ? 'day' : 'days'}`
  return `${min}–${max} days`
}

export function announcementCopy(policy: ShopConfig) {
  const delivery =
    policy.freeShippingThreshold === null
      ? ''
      : `Free delivery on orders from ${formatMoney(policy.freeShippingThreshold, policy.currency, policy.locale, { dropZeroDecimals: true })}`
  return [delivery, returnsCopy(policy.returnWindowDays)].filter(Boolean).join(' — ')
}
