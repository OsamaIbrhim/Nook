import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import {
  clampQuantity,
  isWholeQuantity,
  MAX_LINES,
  normalizeId,
  sameLines,
  sanitizeLines,
  type CartLine
} from './cartLines'
import { loadCart } from './cartStorage'

export type CartState = { lines: CartLine[] }

const cartSlice = createSlice({
  name: 'cart',
  initialState: (): CartState => ({ lines: loadCart() }),
  reducers: {
    addLine(state, action: PayloadAction<{ productId: string; quantity?: number }>) {
      const { quantity = 1 } = action.payload
      const productId = normalizeId(action.payload.productId)
      if (!isWholeQuantity(quantity)) return
      const line = state.lines.find((entry) => entry.productId === productId)
      if (line) line.quantity = clampQuantity(line.quantity + quantity)
      else if (state.lines.length < MAX_LINES) state.lines.push({ productId, quantity: clampQuantity(quantity) })
    },
    setQuantity(state, action: PayloadAction<{ productId: string; quantity: number }>) {
      if (!Number.isInteger(action.payload.quantity)) return
      const line = state.lines.find((entry) => entry.productId === normalizeId(action.payload.productId))
      if (line) line.quantity = clampQuantity(action.payload.quantity)
    },
    removeLine(state, action: PayloadAction<string>) {
      state.lines = state.lines.filter((line) => line.productId !== normalizeId(action.payload))
    },
    restoreLine(state, action: PayloadAction<CartLine>) {
      const [line] = sanitizeLines([action.payload])
      if (line && state.lines.length < MAX_LINES && !state.lines.some((entry) => entry.productId === line.productId)) {
        state.lines.push(line)
      }
    },
    clear(state) {
      state.lines = []
    },
    replaceAll(state, action: PayloadAction<CartLine[]>) {
      const next = sanitizeLines(action.payload)
      if (!sameLines(state.lines, next)) state.lines = next
    }
  }
})

export const { addLine, setQuantity, removeLine, restoreLine, clear, replaceAll } = cartSlice.actions
export default cartSlice.reducer
