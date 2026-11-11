import { afterEach, describe, expect, it, vi } from 'vitest'
import { CART_KEY, loadCart, saveCart } from './cartStorage'

const MUG = 'a1'.repeat(12)
const LAMP = 'b2'.repeat(12)
const legacySnapshot = (id: string, quantity: number) => ({
  product: { _id: id, name: 'Stale name', price: 1, stock: 3 },
  quantity
})

afterEach(() => vi.restoreAllMocks())

describe('loadCart', () => {
  it('is empty for a first visit', () => {
    expect(loadCart()).toEqual([])
  })

  it('reads the versioned value written by saveCart', () => {
    saveCart([{ productId: MUG, quantity: 2 }])
    expect(loadCart()).toEqual([{ productId: MUG, quantity: 2 }])
  })

  it('writes ids and quantities only, with the version inside the value and under the nook.cart key', () => {
    saveCart([{ productId: MUG, quantity: 2 }])
    expect(CART_KEY).toBe('nook.cart')
    expect(JSON.parse(localStorage.getItem('nook.cart')!)).toEqual({
      version: 1,
      lines: [{ productId: MUG, quantity: 2 }]
    })
  })

  it('returns an empty cart for corrupt JSON instead of throwing', () => {
    localStorage.setItem('nook.cart', '{not json')
    expect(loadCart()).toEqual([])
  })

  it('returns an empty cart for a value that is not an object with lines, or has an unknown version', () => {
    for (const value of ['null', '42', '"text"', '[]', '{"version":1}', '{"version":2,"lines":[]}']) {
      localStorage.setItem('nook.cart', value)
      expect(loadCart(), value).toEqual([])
    }
  })

  it('drops lines with a non-string or malformed id, and lines whose quantity is not a whole number of at least 1', () => {
    localStorage.setItem(
      'nook.cart',
      JSON.stringify({
        version: 1,
        lines: [
          { productId: MUG, quantity: 1 },
          { productId: 42, quantity: 1 },
          { productId: 'not-an-id', quantity: 1 },
          { productId: LAMP, quantity: 0 },
          { productId: LAMP, quantity: -2 },
          { productId: LAMP, quantity: 1.5 },
          { productId: LAMP, quantity: '2' },
          null,
          'junk'
        ]
      })
    )
    expect(loadCart()).toEqual([{ productId: MUG, quantity: 1 }])
  })

  it('merges duplicate ids by adding quantities: 2 + 3 = 5', () => {
    localStorage.setItem(
      'nook.cart',
      JSON.stringify({
        version: 1,
        lines: [
          { productId: MUG, quantity: 2 },
          { productId: MUG, quantity: 3 }
        ]
      })
    )
    expect(loadCart()).toEqual([{ productId: MUG, quantity: 5 }])
  })

  it('lowercases ids so the same product never appears twice', () => {
    localStorage.setItem(
      'nook.cart',
      JSON.stringify({ version: 1, lines: [{ productId: MUG.toUpperCase(), quantity: 1 }] })
    )
    expect(loadCart()).toEqual([{ productId: MUG, quantity: 1 }])
  })

  it('keeps at most 50 lines, the most a quote request accepts', () => {
    const lines = Array.from({ length: 60 }, (_, index) => ({
      productId: index.toString(16).padStart(24, '0'),
      quantity: 1
    }))
    localStorage.setItem('nook.cart', JSON.stringify({ version: 1, lines }))
    const loaded = loadCart()
    expect(loaded).toHaveLength(50)
    expect(loaded[49].productId).toBe((49).toString(16).padStart(24, '0'))
  })

  it('caps an absurd quantity at 999 so it never reaches the API', () => {
    localStorage.setItem('nook.cart', JSON.stringify({ version: 1, lines: [{ productId: MUG, quantity: 5000 }] }))
    expect(loadCart()).toEqual([{ productId: MUG, quantity: 999 }])
  })
})

describe('migration of the legacy cart key', () => {
  it('turns product snapshots into ids and quantities, writes the new key and deletes the old one', () => {
    localStorage.setItem('cart', JSON.stringify([legacySnapshot(MUG, 2), legacySnapshot(LAMP, 1)]))
    expect(loadCart()).toEqual([
      { productId: MUG, quantity: 2 },
      { productId: LAMP, quantity: 1 }
    ])
    expect(localStorage.getItem('cart')).toBeNull()
    expect(JSON.parse(localStorage.getItem('nook.cart')!).version).toBe(1)
  })

  it('keeps none of the stale product data: price, stock and name are not carried over', () => {
    localStorage.setItem('cart', JSON.stringify([legacySnapshot(MUG, 2)]))
    loadCart()
    expect(localStorage.getItem('nook.cart')).not.toMatch(/Stale name|price|stock/)
  })

  it('skips legacy entries without a product id or a valid quantity', () => {
    localStorage.setItem(
      'cart',
      JSON.stringify([{ quantity: 2 }, legacySnapshot(MUG, 0), legacySnapshot(LAMP, 3), 'junk'])
    )
    expect(loadCart()).toEqual([{ productId: LAMP, quantity: 3 }])
  })

  it('discards a corrupt legacy value and still deletes it', () => {
    localStorage.setItem('cart', '{broken')
    expect(loadCart()).toEqual([])
    expect(localStorage.getItem('cart')).toBeNull()
  })

  it('prefers the new key when both exist and still removes the legacy one', () => {
    saveCart([{ productId: LAMP, quantity: 4 }])
    localStorage.setItem('cart', JSON.stringify([legacySnapshot(MUG, 2)]))
    expect(loadCart()).toEqual([{ productId: LAMP, quantity: 4 }])
    expect(localStorage.getItem('cart')).toBeNull()
  })
})

describe('storage failures', () => {
  it('survives a browser that refuses to read or write storage', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    expect(loadCart()).toEqual([])
    expect(() => saveCart([{ productId: MUG, quantity: 1 }])).not.toThrow()
  })
})
