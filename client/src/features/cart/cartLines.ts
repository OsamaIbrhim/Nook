export type CartLine = { productId: string; quantity: number }

export const MAX_LINES = 50
export const MAX_QUANTITY = 999
const PRODUCT_ID = /^[a-f\d]{24}$/i

export const isWholeQuantity = (value: unknown): value is number => Number.isInteger(value) && (value as number) >= 1
export const clampQuantity = (quantity: number) => Math.min(Math.max(quantity, 1), MAX_QUANTITY)
export const normalizeId = (id: string) => id.toLowerCase()

export function sanitizeLines(candidates: unknown): CartLine[] {
  if (!Array.isArray(candidates)) return []
  const merged = new Map<string, number>()
  for (const candidate of candidates) {
    const { productId, quantity } = (candidate ?? {}) as Record<string, unknown>
    if (typeof productId !== 'string' || !PRODUCT_ID.test(productId) || !isWholeQuantity(quantity)) continue
    const id = normalizeId(productId)
    merged.set(id, clampQuantity((merged.get(id) ?? 0) + quantity))
  }
  return [...merged].slice(0, MAX_LINES).map(([productId, quantity]) => ({ productId, quantity }))
}

export const sameLines = (a: CartLine[], b: CartLine[]) =>
  a.length === b.length &&
  a.every((line, index) => line.productId === b[index].productId && line.quantity === b[index].quantity)
