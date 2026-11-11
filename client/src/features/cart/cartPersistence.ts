import type { UnknownAction } from '@reduxjs/toolkit'
import { replaceAll, type CartState } from './cartSlice'
import { CART_KEY, loadCart, saveCart } from './cartStorage'

type CartStore = {
  dispatch: (action: UnknownAction) => unknown
  getState: () => { cart: CartState }
  subscribe: (listener: () => void) => () => void
}

export function connectCartPersistence(store: CartStore) {
  let saved = store.getState().cart.lines
  const unsubscribe = store.subscribe(() => {
    const { lines } = store.getState().cart
    if (lines === saved) return
    saved = lines
    saveCart(lines)
  })
  const onStorage = (event: StorageEvent) => {
    if (event.key === CART_KEY || event.key === null) store.dispatch(replaceAll(loadCart()))
  }
  window.addEventListener('storage', onStorage)
  return () => {
    unsubscribe()
    window.removeEventListener('storage', onStorage)
  }
}
