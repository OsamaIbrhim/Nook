import { describe, expect, it } from 'vitest'
import { applyListingChange, parseListingParams, toApiParams, toSearchParams } from './listingParams'

const parse = (query: string) => parseListingParams(new URLSearchParams(query))

describe('parseListingParams', () => {
  it('reads search, category slug, sort and page from the URL', () => {
    expect(parse('search=mug&category=kitchen&sort=price_asc&page=3')).toEqual({
      search: 'mug',
      category: 'kitchen',
      sort: 'price_asc',
      page: 3
    })
  })

  it('uses defaults for an empty URL: no search, no category, newest first, page 1', () => {
    expect(parse('')).toEqual({ search: '', category: '', sort: 'newest', page: 1 })
  })

  it('ignores parameters it does not own, such as tracking tags', () => {
    expect(parse('utm_source=mail&category=home&fbclid=abc')).toEqual({
      search: '',
      category: 'home',
      sort: 'newest',
      page: 1
    })
  })

  it('falls back to newest for an unknown sort', () => {
    expect(parse('sort=cheapest').sort).toBe('newest')
  })

  it('falls back to page 1 for zero, negative, fractional or non-numeric pages', () => {
    for (const page of ['0', '-2', '1.5', 'abc', '']) expect(parse(`page=${page}`).page).toBe(1)
  })

  it('lower-cases the category slug and drops a legacy 24-character id, since categories are addressed by slug only', () => {
    expect(parse('category=Kitchen').category).toBe('kitchen')
    expect(parse(`category=${'a1'.repeat(12)}`).category).toBe('')
  })

  it('trims the search text and keeps at most 60 characters, the limit the API applies', () => {
    expect(parse('search=%20%20mug%20%20').search).toBe('mug')
    expect(parse(`search=${'x'.repeat(80)}`).search).toBe('x'.repeat(60))
    expect(parse('search=%20%20').search).toBe('')
  })
})

describe('toSearchParams', () => {
  it('writes only non-default values, in a stable order', () => {
    expect(toSearchParams({ search: 'mug', category: 'home', sort: 'name', page: 2 }).toString()).toBe(
      'search=mug&category=home&sort=name&page=2'
    )
    expect(toSearchParams({ search: '', category: '', sort: 'newest', page: 1 }).toString()).toBe('')
  })

  it('encodes search text so it survives the round trip', () => {
    const text = 'cups & saucers 100%'
    const params = toSearchParams({ search: text, category: '', sort: 'newest', page: 1 })
    expect(params.toString()).toBe('search=cups+%26+saucers+100%25')
    expect(parseListingParams(params).search).toBe(text)
  })
})

describe('applyListingChange', () => {
  const current = { search: 'mug', category: 'home', sort: 'name' as const, page: 4 }

  it('returns to page 1 when search, category or sort changes', () => {
    expect(applyListingChange(current, { category: 'kitchen' })).toEqual({ ...current, category: 'kitchen', page: 1 })
    expect(applyListingChange(current, { sort: 'price_desc' }).page).toBe(1)
    expect(applyListingChange(current, { search: 'lamp' }).page).toBe(1)
  })

  it('keeps the page when only the page changes', () => {
    expect(applyListingChange(current, { page: 5 })).toEqual({ ...current, page: 5 })
  })

  it('clears a filter when it is set to an empty value', () => {
    expect(applyListingChange(current, { category: '' }).category).toBe('')
  })
})

describe('toApiParams', () => {
  it('sends only what narrows the result: search, category, a non-default sort, and a page after the first', () => {
    expect(toApiParams({ search: 'mug', category: 'home', sort: 'price_asc', page: 2 })).toEqual({
      search: 'mug',
      category: 'home',
      sort: 'price_asc',
      page: 2
    })
    expect(toApiParams({ search: '', category: '', sort: 'newest', page: 1 })).toEqual({})
  })
})
