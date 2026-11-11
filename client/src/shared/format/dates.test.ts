import { describe, expect, it } from 'vitest'
import { formatDate } from './dates'

describe('formatDate', () => {
  it('formats an ISO date as a medium date in the given locale: 2026-11-09 is Nov 9, 2026 in English', () => {
    expect(formatDate('2026-11-09T12:00:00', 'en-US')).toBe('Nov 9, 2026')
  })

  it('uses the locale it is given: 09.11.2026 in German', () => {
    expect(formatDate('2026-11-09T12:00:00', 'de-DE')).toBe('09.11.2026')
  })
})
