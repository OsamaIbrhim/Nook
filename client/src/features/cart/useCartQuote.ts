import { useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useDebouncedValue } from '../../shared/timing/useDebouncedValue'
import { useQuoteCartQuery } from './api'
import type { CartLine } from './cartLines'
import { replaceAll, type CartState } from './cartSlice'
import { knownPrices } from './knownPrices'
import { reconcileCart, rememberPrices, type CartNotice } from './reconcile'

const QUOTE_DEBOUNCE_MS = 300

type CartRoot = { cart: CartState }
export const useCartLines = () => useSelector((state: CartRoot) => state.cart.lines)
export const useCartCount = () =>
  useSelector((state: CartRoot) => state.cart.lines.reduce((total, line) => total + line.quantity, 0))

const byProductId = (a: CartLine, b: CartLine) => a.productId.localeCompare(b.productId)

export function useCartQuote() {
  const dispatch = useDispatch()
  const lines = useCartLines()
  const linesRef = useRef(lines)
  linesRef.current = lines
  const quoted = useDebouncedValue(lines, QUOTE_DEBOUNCE_MS)
  const request = useMemo(() => [...quoted].sort(byProductId), [quoted])
  const [notices, setNotices] = useState<CartNotice[]>([])

  const result = useQuoteCartQuery(request, {
    skip: request.length === 0,
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true
  })
  const fresh = result.currentData

  useEffect(() => {
    if (!fresh) return
    const outcome = reconcileCart(linesRef.current, fresh, knownPrices)
    rememberPrices(fresh, knownPrices)
    if (outcome.notices.length) setNotices((previous) => [...previous, ...outcome.notices])
    dispatch(replaceAll(outcome.lines))
  }, [fresh, dispatch])

  return {
    lines,
    quote: result.data,
    isLoading: result.isLoading,
    isFetching: result.isFetching || quoted !== lines,
    error: result.error,
    refetch: result.refetch,
    notices,
    dismissNotices: () => setNotices([])
  }
}
