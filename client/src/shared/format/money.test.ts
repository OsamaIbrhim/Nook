import { describe, expect, it } from 'vitest'
import { formatMoney } from './money'

describe('formatMoney', () => {
  it('shows the given currency with two decimals: 24 EGP is EGP 24.00 with a no-break space', () => {
    expect(formatMoney(24, 'egp', 'en-US')).toBe('EGP 24.00')
  })

  it('groups thousands: 1234.5 EGP is EGP 1,234.50', () => {
    expect(formatMoney(1234.5, 'EGP', 'en-US')).toBe('EGP 1,234.50')
  })

  it('accepts a lowercase currency code, as the API sends it', () => {
    expect(formatMoney(10, 'usd', 'en-US')).toBe('$10.00')
  })

  it('formats zero and negative amounts', () => {
    expect(formatMoney(0, 'usd', 'en-US')).toBe('$0.00')
    expect(formatMoney(-3, 'usd', 'en-US')).toBe('-$3.00')
  })

  it('follows the locale it is given, not a built-in one: 1234.5 EUR is 1.234,50 € in German', () => {
    expect(formatMoney(1234.5, 'eur', 'de-DE')).toBe('1.234,50 €')
    expect(formatMoney(1234.5, 'eur', 'en-US')).toBe('€1,234.50')
  })

  it('can drop the decimals of a whole amount for copy: 200 EGP is EGP 200, 52.5 EGP stays EGP 52.50', () => {
    expect(formatMoney(200, 'egp', 'en-US', { dropZeroDecimals: true })).toBe('EGP 200')
    expect(formatMoney(52.5, 'egp', 'en-US', { dropZeroDecimals: true })).toBe('EGP 52.50')
  })
})
