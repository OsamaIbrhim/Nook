import { configureStore } from '@reduxjs/toolkit'
import { describe, expect, it } from 'vitest'
import cartReducer, { addLine, clear, removeLine, replaceAll, restoreLine, setQuantity } from './cartSlice'
import { connectCartPersistence } from './cartPersistence'
import { CART_KEY, loadCart, saveCart } from './cartStorage'

const MUG = 'a1'.repeat(12)
const LAMP = 'b2'.repeat(12)
const BOWL = 'c3'.repeat(12)

const stateOf = (lines: { productId: string; quantity: number }[]) => ({ lines })
const reduce = (lines: { productId: string; quantity: number }[], action: Parameters<typeof cartReducer>[1]) =>
  cartReducer(stateOf(lines), action).lines

describe('addLine', () => {
  it('adds a new product with the given quantity, defaulting to 1', () => {
    expect(reduce([], addLine({ productId: MUG }))).toEqual([{ productId: MUG, quantity: 1 }])
    expect(reduce([], addLine({ productId: MUG, quantity: 3 }))).toEqual([{ productId: MUG, quantity: 3 }])
  })

  it('adds to an existing line: 2 + 3 = 5, keeping its position', () => {
    const lines = [
      { productId: MUG, quantity: 2 },
      { productId: LAMP, quantity: 1 }
    ]
    expect(reduce(lines, addLine({ productId: MUG, quantity: 3 }))).toEqual([
      { productId: MUG, quantity: 5 },
      { productId: LAMP, quantity: 1 }
    ])
  })

  it('ignores a quantity that is not a whole number of at least 1', () => {
    for (const quantity of [0, -1, 1.5, Number.NaN]) {
      expect(reduce([], addLine({ productId: MUG, quantity }))).toEqual([])
    }
  })

  it('never stores more than 999 of one product', () => {
    expect(reduce([{ productId: MUG, quantity: 998 }], addLine({ productId: MUG, quantity: 5 }))).toEqual([
      { productId: MUG, quantity: 999 }
    ])
  })

  it('refuses a 51st distinct product, the most a quote accepts, but still adds to an existing one', () => {
    const fifty = Array.from({ length: 50 }, (_, index) => ({
      productId: index.toString(16).padStart(24, '0'),
      quantity: 1
    }))
    expect(reduce(fifty, addLine({ productId: MUG }))).toHaveLength(50)
    expect(reduce(fifty, addLine({ productId: fifty[0].productId, quantity: 2 }))[0].quantity).toBe(3)
  })

  it('normalises the id to lower case', () => {
    expect(reduce([{ productId: MUG, quantity: 1 }], addLine({ productId: MUG.toUpperCase() }))).toEqual([
      { productId: MUG, quantity: 2 }
    ])
  })
})

describe('setQuantity', () => {
  const lines = [{ productId: MUG, quantity: 2 }]

  it('sets the quantity of an existing line', () => {
    expect(reduce(lines, setQuantity({ productId: MUG, quantity: 7 }))).toEqual([{ productId: MUG, quantity: 7 }])
  })

  it('never goes below 1: removing a line is a separate action', () => {
    expect(reduce(lines, setQuantity({ productId: MUG, quantity: 0 }))).toEqual([{ productId: MUG, quantity: 1 }])
    expect(reduce(lines, setQuantity({ productId: MUG, quantity: -4 }))).toEqual([{ productId: MUG, quantity: 1 }])
  })

  it('never goes above 999', () => {
    expect(reduce(lines, setQuantity({ productId: MUG, quantity: 5000 }))).toEqual([{ productId: MUG, quantity: 999 }])
  })

  it('does nothing for a product that is not in the bag, or a non-whole quantity', () => {
    expect(reduce(lines, setQuantity({ productId: LAMP, quantity: 3 }))).toEqual(lines)
    expect(reduce(lines, setQuantity({ productId: MUG, quantity: 2.5 }))).toEqual(lines)
  })
})

describe('removeLine, restoreLine and clear', () => {
  const lines = [
    { productId: MUG, quantity: 2 },
    { productId: LAMP, quantity: 1 }
  ]

  it('removes one product and leaves the others', () => {
    expect(reduce(lines, removeLine(MUG))).toEqual([{ productId: LAMP, quantity: 1 }])
  })

  it('restores a removed line (undo) once, appending it, and ignores a second restore', () => {
    const afterRemove = reduce(lines, removeLine(MUG))
    const restored = reduce(afterRemove, restoreLine({ productId: MUG, quantity: 2 }))
    expect(restored).toEqual([
      { productId: LAMP, quantity: 1 },
      { productId: MUG, quantity: 2 }
    ])
    expect(reduce(restored, restoreLine({ productId: MUG, quantity: 9 }))).toEqual(restored)
  })

  it('empties the bag', () => {
    expect(reduce(lines, clear())).toEqual([])
  })
})

describe('replaceAll', () => {
  it('replaces the lines with sanitised ones: invalid entries dropped, duplicates merged', () => {
    const next = reduce(
      [{ productId: MUG, quantity: 1 }],
      replaceAll([
        { productId: LAMP, quantity: 2 },
        { productId: LAMP, quantity: 1 },
        { productId: BOWL, quantity: 0 }
      ])
    )
    expect(next).toEqual([{ productId: LAMP, quantity: 3 }])
  })

  it('keeps the very same state object when nothing changes, so no render and no write happen', () => {
    const state = stateOf([{ productId: MUG, quantity: 2 }])
    expect(cartReducer(state, replaceAll([{ productId: MUG, quantity: 2 }]))).toBe(state)
  })
})

describe('persistence', () => {
  const makeStore = () => {
    const store = configureStore({ reducer: { cart: cartReducer } })
    const disconnect = connectCartPersistence(store)
    return { store, disconnect }
  }

  it('starts from what is stored, migrating the legacy key', () => {
    localStorage.setItem('cart', JSON.stringify([{ product: { _id: MUG, price: 1 }, quantity: 2 }]))
    const { store, disconnect } = makeStore()
    expect(store.getState().cart.lines).toEqual([{ productId: MUG, quantity: 2 }])
    disconnect()
  })

  it('writes every change to nook.cart from a store subscriber, not from the reducers', () => {
    const { store, disconnect } = makeStore()
    store.dispatch(addLine({ productId: MUG, quantity: 2 }))
    expect(loadCart()).toEqual([{ productId: MUG, quantity: 2 }])
    store.dispatch(clear())
    expect(loadCart()).toEqual([])
    disconnect()
  })

  it('a reducer call alone writes nothing: the reducers stay pure', () => {
    cartReducer(stateOf([]), addLine({ productId: MUG }))
    expect(localStorage.getItem(CART_KEY)).toBeNull()
  })

  it('replaces its lines when another tab changes the stored cart (storage event)', () => {
    const { store, disconnect } = makeStore()
    saveCart([{ productId: LAMP, quantity: 3 }])
    window.dispatchEvent(new StorageEvent('storage', { key: CART_KEY }))
    expect(store.getState().cart.lines).toEqual([{ productId: LAMP, quantity: 3 }])
    disconnect()
  })

  it('ignores storage events for other keys and stops listening after disconnect', () => {
    const { store, disconnect } = makeStore()
    saveCart([{ productId: LAMP, quantity: 3 }])
    window.dispatchEvent(new StorageEvent('storage', { key: 'something-else' }))
    expect(store.getState().cart.lines).toEqual([])
    disconnect()
    window.dispatchEvent(new StorageEvent('storage', { key: CART_KEY }))
    expect(store.getState().cart.lines).toEqual([])
  })
})
