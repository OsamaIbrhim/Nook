import { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { Link, useSearchParams } from 'react-router-dom'
import { clear } from '../../cart'
import { clearAttempt } from '../checkoutAttempt'
import { useOrderConfirmation, type ConfirmationState } from '../useOrderConfirmation'

const copy: Record<ConfirmationState, { eyebrow: string; title: string; text: string }> = {
  paid: {
    eyebrow: 'Thank you',
    title: 'Payment received',
    text: 'Your payment is confirmed and we are preparing your order.'
  },
  confirming: {
    eyebrow: 'One moment',
    title: 'Confirming your payment',
    text: 'This usually takes a few seconds. Please keep this page open.'
  },
  'timed-out': {
    eyebrow: 'Still working',
    title: 'We are still confirming your payment',
    text: 'Your bag is kept until the payment is confirmed. Check your orders for the latest status.'
  },
  'not-found': {
    eyebrow: 'Order not found',
    title: 'We couldn’t find this order',
    text: 'The payment reference does not match an order on your account. Check your orders for the latest status.'
  },
  'missing-session': {
    eyebrow: 'Payment not confirmed',
    title: 'We couldn’t confirm this payment',
    text: 'This page needs the payment reference sent back by Stripe. Check your orders for the latest status.'
  }
}

export function CheckoutSuccessPage() {
  const dispatch = useDispatch()
  const [params] = useSearchParams()
  const { state } = useOrderConfirmation(params.get('session_id'))
  const { eyebrow, title, text } = copy[state]

  useEffect(() => {
    if (state !== 'paid') return
    dispatch(clear())
    clearAttempt()
  }, [state, dispatch])

  return (
    <div className="container-app grid min-h-[65vh] place-items-center py-(--section-gap)">
      <div className="max-w-xl text-center" role="status">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-4 text-h1 tracking-[-0.015em]">{title}</h1>
        <p className="mx-auto mt-5 max-w-md text-ink-muted">{text}</p>
        <Link to="/orders" className="btn-primary mt-8">
          View your orders
        </Link>
      </div>
    </div>
  )
}
