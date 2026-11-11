import { afterEach, describe, expect, it } from 'vitest'
import { attemptKey, bodyFingerprint, clearAttempt } from './checkoutAttempt'

const address = {
  name: 'Maya Hassan',
  line1: '12 Garden Street',
  line2: '',
  city: 'Cairo',
  state: '',
  postalCode: '11511',
  country: 'EG',
  phone: ''
}
const MUG = 'a1'.repeat(12)
const LAMP = 'b2'.repeat(12)
afterEach(() => clearAttempt())

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

describe('attemptKey', () => {
  it('creates a UUID the server accepts as an Idempotency-Key', () => {
    expect(attemptKey('body-1')).toMatch(UUID)
  })

  it('returns the same key for the same request body, so a retry cannot create a second order', () => {
    expect(attemptKey('body-1')).toBe(attemptKey('body-1'))
  })

  it('returns a new key when the request body changed, since the server answers 409 for one key with two bodies', () => {
    const first = attemptKey('body-1')
    const second = attemptKey('body-2')
    expect(second).not.toBe(first)
    expect(attemptKey('body-2')).toBe(second)
  })

  it('survives a page reload: the key is kept for the tab session', () => {
    const key = attemptKey('body-1')
    expect(JSON.parse(sessionStorage.getItem('nook.checkout-attempt')!)).toEqual({ fingerprint: 'body-1', key })
    expect(attemptKey('body-1')).toBe(key)
  })

  it('is forgotten after clearAttempt, so the next purchase starts a new order', () => {
    const key = attemptKey('body-1')
    clearAttempt()
    expect(sessionStorage.getItem('nook.checkout-attempt')).toBeNull()
    expect(attemptKey('body-1')).not.toBe(key)
  })

  it('still produces, and reuses, a key when storage is unavailable', () => {
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = () => {
      throw new Error('blocked')
    }
    try {
      const key = attemptKey('body-1')
      expect(key).toMatch(UUID)
      expect(attemptKey('body-1')).toBe(key)
    } finally {
      Storage.prototype.setItem = original
    }
  })
})

describe('bodyFingerprint', () => {
  const lines = [
    { productId: LAMP, quantity: 1 },
    { productId: MUG, quantity: 2 }
  ]

  it('is the same for the same lines in any order', () => {
    expect(bodyFingerprint([...lines].reverse(), address)).toBe(bodyFingerprint(lines, address))
  })

  it('changes when a quantity changes: 2 mugs and 3 mugs are different orders', () => {
    expect(bodyFingerprint([lines[0], { productId: MUG, quantity: 3 }], address)).not.toBe(
      bodyFingerprint(lines, address)
    )
  })

  it('changes when any address field changes, whitespace included, because the server compares the exact body', () => {
    for (const field of Object.keys(address) as (keyof typeof address)[]) {
      expect(bodyFingerprint(lines, { ...address, [field]: `${address[field]} x` }), field).not.toBe(
        bodyFingerprint(lines, address)
      )
    }
  })
})
