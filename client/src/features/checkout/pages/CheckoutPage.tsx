import { LockKeyhole } from 'lucide-react'
import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { toast } from 'sonner'
import type { Address } from '../../../shared/contract/types'
import { useMoney } from '../../policy'
import { errorMessage } from '../../../shared/http/errors'
import { redirectTo } from '../../../shared/http/redirect'
import { mediaUrl } from '../../../shared/media/imageUrl'
import { useSession } from '../../auth'
import { useCartQuote } from '../../cart'
import { useCreateCheckoutSessionMutation, useCreateOrderMutation } from '../api'
import { attemptKey, bodyFingerprint, clearAttempt } from '../checkoutAttempt'

export function CheckoutPage() {
  const money = useMoney()
  const { lines, quote, isFetching } = useCartQuote()
  const user = useSession().user
  const [loading, setLoading] = useState(false)
  const [createOrder] = useCreateOrderMutation()
  const [createSession] = useCreateCheckoutSessionMutation()
  const [address, setAddress] = useState<Address>({
    name: user?.name || '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'EG',
    phone: ''
  })
  const currency = quote?.currency ?? ''
  const priced = new Map(quote?.lines.map((line) => [line.productId, line]))
  const canPay = !loading && !isFetching && !!quote?.checkoutAllowed
  if (!lines.length) return <Navigate to="/cart" replace />
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canPay) return
    setLoading(true)
    try {
      const body = {
        items: lines.map((line) => ({ product: line.productId, quantity: line.quantity })),
        shippingAddress: address
      }
      const order = await createOrder({ body, idempotencyKey: attemptKey(bodyFingerprint(lines, address)) }).unwrap()
      if (!order.actions.canPay) {
        clearAttempt()
        throw new Error('This order can no longer be paid. Please try again.')
      }
      const session = await createSession(order._id).unwrap()
      redirectTo(session.url)
    } catch (err) {
      toast.error(errorMessage(err))
      setLoading(false)
    }
  }
  return (
    <div className="container-app py-10">
      <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-[.2em] text-forest">Secure checkout</p>
        <h1 className="mt-2 text-4xl font-black">Where should we send it?</h1>
      </div>
      <form onSubmit={submit} className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <section className="card p-6 sm:p-8">
          <h2 className="mb-6 text-xl font-bold">Shipping information</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="sm:col-span-2">
              <span className="label">Full name</span>
              <input
                required
                className="field"
                value={address.name}
                onChange={(e) => setAddress({ ...address, name: e.target.value })}
              />
            </label>
            <label className="sm:col-span-2">
              <span className="label">Address</span>
              <input
                required
                className="field"
                value={address.line1}
                onChange={(e) => setAddress({ ...address, line1: e.target.value })}
              />
            </label>
            <label className="sm:col-span-2">
              <span className="label">Apartment, suite (optional)</span>
              <input
                className="field"
                value={address.line2}
                onChange={(e) => setAddress({ ...address, line2: e.target.value })}
              />
            </label>
            <label>
              <span className="label">City</span>
              <input
                required
                className="field"
                value={address.city}
                onChange={(e) => setAddress({ ...address, city: e.target.value })}
              />
            </label>
            <label>
              <span className="label">State / region</span>
              <input
                className="field"
                value={address.state}
                onChange={(e) => setAddress({ ...address, state: e.target.value })}
              />
            </label>
            <label>
              <span className="label">Postal code</span>
              <input
                required
                className="field"
                value={address.postalCode}
                onChange={(e) => setAddress({ ...address, postalCode: e.target.value })}
              />
            </label>
            <label>
              <span className="label">Country code</span>
              <input
                required
                minLength={2}
                maxLength={2}
                className="field uppercase"
                value={address.country}
                onChange={(e) => setAddress({ ...address, country: e.target.value.toUpperCase() })}
              />
            </label>
            <label className="sm:col-span-2">
              <span className="label">Phone (optional)</span>
              <input
                className="field"
                value={address.phone}
                onChange={(e) => setAddress({ ...address, phone: e.target.value })}
              />
            </label>
          </div>
        </section>
        <aside className="card h-fit p-6">
          <h2 className="font-bold">Your order</h2>
          <div className="my-5 max-h-64 space-y-3 overflow-auto">
            {lines.map(({ productId, quantity }) => {
              const line = priced.get(productId)
              return (
                <div className="flex items-center gap-3 text-sm" key={productId}>
                  <div className="size-12 overflow-hidden rounded-lg bg-cream">
                    {line?.image && (
                      <img src={mediaUrl(line.image.url)} alt="" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    {line ? (
                      <p className="truncate font-medium">{line.name}</p>
                    ) : (
                      <div className="h-4 w-28 animate-pulse rounded bg-black/8" />
                    )}
                    <p className="text-black/40">Qty {quantity}</p>
                  </div>
                  {line ? (
                    <b>{money(line.lineTotal, currency)}</b>
                  ) : (
                    <div className="h-4 w-14 animate-pulse rounded bg-black/8" />
                  )}
                </div>
              )
            })}
          </div>
          {quote && (
            <div className="space-y-2 border-t border-black/8 pt-4 text-sm text-black/55">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{money(quote.subtotal, currency)}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping</span>
                <span>{quote.shipping === 0 ? 'Free' : money(quote.shipping, currency)}</span>
              </div>
            </div>
          )}
          <div className="mt-2 flex justify-between border-t border-black/8 pt-4 text-lg font-bold">
            <span>Total</span>
            {quote ? (
              <span>{money(quote.total, currency)}</span>
            ) : (
              <div className="h-6 w-20 animate-pulse rounded bg-black/8" />
            )}
          </div>
          <button disabled={!canPay} className="btn-primary mt-6 w-full">
            <LockKeyhole size={17} />
            {loading ? 'Redirecting…' : 'Pay securely with Stripe'}
          </button>
          <p className="mt-3 text-center text-xs text-black/40">You’ll complete payment on Stripe’s secure page.</p>
        </aside>
      </form>
    </div>
  )
}
