import { Lock } from 'lucide-react'
import { useState, type FormEvent, type InputHTMLAttributes } from 'react'
import { Navigate } from 'react-router-dom'
import { toast } from 'sonner'
import type { Address } from '../../../shared/contract/types'
import { errorMessage } from '../../../shared/http/errors'
import { redirectTo } from '../../../shared/http/redirect'
import { mediaUrl } from '../../../shared/media/imageUrl'
import { useSession } from '../../auth'
import { QuoteTotals, useCartQuote } from '../../cart'
import { useMoney } from '../../policy'
import { useCreateCheckoutSessionMutation, useCreateOrderMutation } from '../api'
import { attemptKey, bodyFingerprint, clearAttempt } from '../checkoutAttempt'

type AddressField = keyof Address

const fields: {
  key: AddressField
  label: string
  wide?: boolean
  input: InputHTMLAttributes<HTMLInputElement>
}[] = [
  { key: 'name', label: 'Full name', wide: true, input: { required: true, autoComplete: 'name' } },
  { key: 'line1', label: 'Address', wide: true, input: { required: true, autoComplete: 'address-line1' } },
  { key: 'line2', label: 'Apartment, suite (optional)', wide: true, input: { autoComplete: 'address-line2' } },
  { key: 'city', label: 'City', input: { required: true, autoComplete: 'address-level2' } },
  { key: 'state', label: 'State / region', input: { autoComplete: 'address-level1' } },
  { key: 'postalCode', label: 'Postal code', input: { required: true, autoComplete: 'postal-code' } },
  {
    key: 'country',
    label: 'Country code',
    input: { required: true, minLength: 2, maxLength: 2, autoComplete: 'country', className: 'field uppercase' }
  },
  { key: 'phone', label: 'Phone (optional)', wide: true, input: { type: 'tel', autoComplete: 'tel' } }
]

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

  const submit = async (event: FormEvent) => {
    event.preventDefault()
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
    <div className="container-app pb-(--section-gap) pt-10 sm:pt-14">
      <p className="eyebrow">Checkout</p>
      <h1 className="mt-3 text-h1 tracking-[-0.015em]">Where should we send it?</h1>
      <form onSubmit={submit} className="mt-10 grid gap-10 lg:grid-cols-12">
        <section className="lg:col-span-7">
          <h2 className="text-title">Delivery address</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            {fields.map(({ key, label, wide, input }) => (
              <label key={key} className={wide ? 'sm:col-span-2' : ''}>
                <span className="label">{label}</span>
                <input
                  className="field"
                  {...input}
                  value={address[key] ?? ''}
                  onChange={(event) =>
                    setAddress({
                      ...address,
                      [key]: key === 'country' ? event.target.value.toUpperCase() : event.target.value
                    })
                  }
                />
              </label>
            ))}
          </div>
        </section>
        <aside className="h-fit bg-paper-sunken p-6 lg:sticky lg:top-[calc(var(--header-h)+1.5rem)] lg:col-span-4 lg:col-start-9">
          <h2 className="text-title">Your order</h2>
          <ul className="my-6 max-h-72 space-y-4 overflow-auto">
            {lines.map(({ productId, quantity }) => {
              const line = priced.get(productId)
              return (
                <li className="flex items-center gap-3 text-sm" key={productId}>
                  <div className="plate aspect-[4/5] w-12 shrink-0">
                    {line?.image && (
                      <img
                        src={mediaUrl(line.image.url)}
                        alt=""
                        width={96}
                        height={120}
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    {line ? <p className="truncate font-medium">{line.name}</p> : <div className="h-4 w-28 bg-paper" />}
                    <p className="text-ink-muted">Qty {quantity}</p>
                  </div>
                  {line ? (
                    <span className="tabular-nums">{money(line.lineTotal, currency)}</span>
                  ) : (
                    <div className="h-4 w-14 bg-paper" />
                  )}
                </li>
              )
            })}
          </ul>
          <div className="border-t border-line-strong pt-5">
            <QuoteTotals quote={quote} />
          </div>
          <button type="submit" disabled={!canPay} className="btn-primary mt-6 w-full">
            <Lock size={16} strokeWidth={1.5} aria-hidden="true" />
            {loading ? 'Redirecting…' : 'Pay securely with Stripe'}
          </button>
          <p className="mt-3 text-center text-caption text-ink-subtle">You’ll complete payment on Stripe’s page.</p>
        </aside>
      </form>
    </div>
  )
}
