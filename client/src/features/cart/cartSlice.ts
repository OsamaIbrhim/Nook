import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { CartItem, Product } from '../../types'

const saved = localStorage.getItem('cart')
const initialState: { items: CartItem[] } = { items: saved ? JSON.parse(saved) : [] }
const save = (items: CartItem[]) => localStorage.setItem('cart', JSON.stringify(items))
const cartSlice = createSlice({
  name: 'cart', initialState,
  reducers: {
    addToCart(state, action: PayloadAction<{ product: Product; quantity?: number }>) {
      const found = state.items.find((item) => item.product._id === action.payload.product._id)
      const amount = action.payload.quantity || 1
      if (found) found.quantity = Math.min(found.quantity + amount, action.payload.product.stock)
      else state.items.push({ product: action.payload.product, quantity: Math.min(amount, action.payload.product.stock) })
      save(state.items)
    },
    updateQuantity(state, action: PayloadAction<{ id: string; quantity: number }>) {
      const item = state.items.find((row) => row.product._id === action.payload.id)
      if (item) item.quantity = Math.max(1, Math.min(action.payload.quantity, item.product.stock))
      save(state.items)
    },
    removeFromCart(state, action: PayloadAction<string>) { state.items = state.items.filter((item) => item.product._id !== action.payload); save(state.items) },
    clearCart(state) { state.items = []; save([]) }
  }
})
export const { addToCart, updateQuantity, removeFromCart, clearCart } = cartSlice.actions
export default cartSlice.reducer
