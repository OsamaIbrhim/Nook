import { CheckCircle2 } from 'lucide-react'
import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAppDispatch } from '../app/hooks'
import { clearCart } from '../features/cart/cartSlice'
export function CheckoutSuccessPage(){const dispatch=useAppDispatch();useEffect(()=>{dispatch(clearCart())},[dispatch]);return <div className="container-app grid min-h-[65vh] place-items-center py-12"><div className="max-w-lg text-center"><CheckCircle2 className="mx-auto text-forest" size={72}/><h1 className="mt-6 text-4xl font-black">Payment received</h1><p className="mt-3 leading-7 text-black/55">Thanks for your order. Stripe is confirming the payment, and your order status will update shortly.</p><Link to="/orders" className="btn-primary mt-7">View your orders</Link></div></div>}
