import { describe, expect, it } from 'vitest'
import { date, money } from './format'

describe('money', () => {
  it('groups thousands and shows two decimals: 1234.5 is $1,234.50', () => {
    expect(money(1234.5)).toBe('$1,234.50')
  })

  it('formats zero and negative amounts', () => {
    expect(money(0)).toBe('$0.00')
    expect(money(-3)).toBe('-$3.00')
  })

  it('accepts a lowercase currency code, as the API sends it', () => {
    expect(money(10, 'usd')).toBe('$10.00')
  })

  it('uses the given currency: 5 EGP is EGP 5.00 with a no-break space', () => {
    expect(money(5, 'egp')).toBe('EGP\u00a05.00')
  })
})

describe('date', () => {
  it('formats an ISO date as a medium English date: 2026-11-09 is Nov 9, 2026', () => {
    expect(date('2026-11-09T12:00:00')).toBe('Nov 9, 2026')
  })
})
