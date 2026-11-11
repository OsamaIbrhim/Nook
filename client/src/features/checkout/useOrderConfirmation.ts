import { useEffect, useState } from 'react'
import type { Order } from '../../shared/contract/types'
import { isApiFailure } from '../../shared/http/errors'
import { useSession } from '../auth'
import { useGetOrderBySessionQuery } from './api'

export type ConfirmationState = 'confirming' | 'paid' | 'timed-out' | 'not-found' | 'missing-session'
type Options = { pollMs?: number; giveUpMs?: number }

export function useOrderConfirmation(sessionId: string | null, { pollMs = 2000, giveUpMs = 60_000 }: Options = {}) {
  const { status } = useSession()
  const [timedOut, setTimedOut] = useState(false)
  const [settled, setSettled] = useState(false)
  const enabled = Boolean(sessionId) && status === 'authenticated'
  const { data: order, error } = useGetOrderBySessionQuery(sessionId ?? '', {
    skip: !enabled,
    pollingInterval: timedOut || settled ? 0 : pollMs
  })
  const paid = order?.paymentStatus === 'paid'
  const notFound = isApiFailure(error) && error.status === 404

  useEffect(() => {
    if (paid || notFound) setSettled(true)
  }, [paid, notFound])

  useEffect(() => {
    if (!enabled || paid || notFound) return
    const timer = window.setTimeout(() => setTimedOut(true), giveUpMs)
    return () => window.clearTimeout(timer)
  }, [enabled, paid, notFound, giveUpMs])

  let state: ConfirmationState = 'confirming'
  if (!sessionId) state = 'missing-session'
  else if (paid) state = 'paid'
  else if (notFound) state = 'not-found'
  else if (timedOut) state = 'timed-out'
  return { state, order: order as Order | undefined }
}
