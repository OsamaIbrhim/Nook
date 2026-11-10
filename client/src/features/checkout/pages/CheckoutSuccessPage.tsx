import { CheckCircle2, LoaderCircle } from 'lucide-react'
import { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { Link, useSearchParams } from 'react-router-dom'
import { clear } from '../../cart'
import { clearAttempt } from '../checkoutAttempt'
import { useOrderConfirmation, type ConfirmationState } from '../useOrderConfirmation'

const copy: Record<ConfirmationState, { title: string; text: string }> = {
  paid: {
    title: 'Payment received',
    text: 'Thanks for your order. Your payment is confirmed and the order is on its way to being prepared.'
  },
  confirming: {
    title: 'Confirming your payment',
    text: 'This usually takes a few seconds. Please keep this page open.'
  },
  'timed-out': {
    title: 'We are still confirming your payment',
    text: 'Your bag is kept until the payment is confirmed. Check your orders for the latest status.'
  },
  'not-found': {
    title: 'We couldn’t find this order',
    text: 'The payment reference does not match an order on your account. Check your orders for the latest status.'
  },
  'missing-session': {
    title: 'We couldn’t confirm this payment',
    text: 'This page needs the payment reference sent back by Stripe. Check your orders for the latest status.'
  }
}

export function CheckoutSuccessPage() {
  const dispatch = useDispatch()
  const [params] = useSearchParams()
  const { state } = useOrderConfirmation(params.get('session_id'))
  const { title, text } = copy[state]

  useEffect(() => {
    if (state !== 'paid') return
    dispatch(clear())
    clearAttempt()
  }, [state, dispatch])

  return (
    <div className="container-app grid min-h-[65vh] place-items-center py-12">
      <div className="max-w-lg text-center" role="status">
        {state === 'paid' ? (
          <CheckCircle2 className="mx-auto text-forest" size={72} />
        ) : (
          <LoaderCircle className={`mx-auto text-forest ${state === 'confirming' ? 'animate-spin' : ''}`} size={72} />
        )}
        <h1 className="mt-6 text-4xl font-black">{title}</h1>
        <p className="mt-3 leading-7 text-black/55">{text}</p>
        <Link to="/orders" className="btn-primary mt-7">
          View your orders
        </Link>
      </div>
    </div>
  )
}
