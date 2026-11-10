import type { Address } from '../../shared/contract/types'

const ATTEMPT_KEY = 'nook.checkout-attempt'

type Line = { productId: string; quantity: number }
type Attempt = { fingerprint: string; key: string }

let inMemory: Attempt | null = null

export const bodyFingerprint = (lines: Line[], address: Address) =>
  JSON.stringify({ items: [...lines].sort((a, b) => a.productId.localeCompare(b.productId)), address })

function readStored(): Attempt | null {
  try {
    return JSON.parse(sessionStorage.getItem(ATTEMPT_KEY) ?? 'null')
  } catch {
    return null
  }
}

export function attemptKey(fingerprint: string): string {
  const current = inMemory ?? readStored()
  if (current?.fingerprint === fingerprint) return current.key
  inMemory = { fingerprint, key: crypto.randomUUID() }
  try {
    sessionStorage.setItem(ATTEMPT_KEY, JSON.stringify(inMemory))
  } catch {
    // the in-memory copy still protects retries made without a reload
  }
  return inMemory.key
}

export function clearAttempt() {
  inMemory = null
  try {
    sessionStorage.removeItem(ATTEMPT_KEY)
  } catch {
    // nothing stored, nothing to clear
  }
}
