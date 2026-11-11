import { sanitizeLines, type CartLine } from './cartLines'

export const CART_KEY = 'nook.cart'
const LEGACY_KEY = 'cart'
const VERSION = 1

function readRaw(key: string) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function parse(raw: string | null): unknown {
  try {
    return raw === null ? undefined : JSON.parse(raw)
  } catch {
    return undefined
  }
}

function removeLegacy() {
  try {
    localStorage.removeItem(LEGACY_KEY)
  } catch {
    // nothing to clean when storage is unavailable
  }
}

function linesFromLegacySnapshots(value: unknown): CartLine[] {
  if (!Array.isArray(value)) return []
  return sanitizeLines(value.map((entry) => ({ productId: entry?.product?._id, quantity: entry?.quantity })))
}

export function saveCart(lines: CartLine[]) {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify({ version: VERSION, lines }))
  } catch {
    // a full or blocked storage only costs persistence, the bag still works for this visit
  }
}

export function loadCart(): CartLine[] {
  const storedRaw = readRaw(CART_KEY)
  const legacyRaw = readRaw(LEGACY_KEY)
  let lines: CartLine[] = []
  if (storedRaw !== null) {
    const stored = parse(storedRaw) as { version?: unknown; lines?: unknown } | null | undefined
    if (stored && typeof stored === 'object' && stored.version === VERSION) lines = sanitizeLines(stored.lines)
  } else if (legacyRaw !== null) {
    lines = linesFromLegacySnapshots(parse(legacyRaw))
    saveCart(lines)
  }
  if (legacyRaw !== null) removeLegacy()
  return lines
}
