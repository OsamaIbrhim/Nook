import { ArrowRight, RotateCcw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { api, errorMessage } from '../api/client'
import { EmptyState } from '../components/EmptyState'
import { Spinner } from '../components/Spinner'
import { StatusBadge } from '../components/StatusBadge'
import type { ApiResponse, Order } from '../types'
import { date, money } from '../utils/format'
import { mediaUrl } from '../utils/media'
export function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]); const [loading, setLoading] = useState(true)
  const load = () => api.get<ApiResponse<{ orders: Order[] }>>('/orders/mine').then((r) => setOrders(r.data.data.orders)).catch((e) => toast.error(errorMessage(e))).finally(() => setLoading(false))
  useEffect(() => { load() }, [])
  const pay = async (id: string) => { try { const { data } = await api.post<ApiResponse<{ url: string }>>('/payments/checkout-session', { orderId: id }); window.location.assign(data.data.url) } catch (e) { toast.error(errorMessage(e)) } }
  if (loading) return <Spinner full/>; if (!orders.length) return <div className="container-app py-14"><EmptyState title="No orders yet" text="Once you place an order, its journey will appear here." action={<Link to="/products" className="btn-primary">Explore products</Link>}/></div>
  return <div className="container-app py-10"><h1 className="text-4xl font-black tracking-tight">Your orders</h1><p className="mt-2 text-black/50">Follow every order from payment to delivery.</p><div className="mt-8 space-y-4">{orders.map((order) => <article key={order._id} className="card p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs text-black/40">ORDER #{order._id.slice(-8).toUpperCase()}</p><h2 className="mt-1 font-bold">Placed {date(order.createdAt)}</h2></div><div className="flex gap-2"><StatusBadge value={order.paymentStatus}/><StatusBadge value={order.status}/></div></div><div className="mt-5 flex flex-wrap items-end justify-between gap-4 border-t border-black/6 pt-5"><div className="flex -space-x-2">{order.items.slice(0,4).map((item, i) => <div key={i} className="grid size-12 place-items-center overflow-hidden rounded-full border-2 border-white bg-cream text-xs">{item.image ? <img src={mediaUrl(item.image)} className="h-full w-full object-cover"/> : item.quantity}</div>)}</div><div className="text-right"><p className="font-bold">{money(order.total, order.currency)}</p><p className="text-xs text-black/40">{order.items.reduce((n,i)=>n+i.quantity,0)} items</p></div><div className="flex gap-2">{order.status === 'pending' && order.paymentStatus === 'unpaid' && <button onClick={() => pay(order._id)} className="btn-secondary"><RotateCcw size={15}/> Resume payment</button>}<Link to={`/orders/${order._id}`} className="btn-primary">View details <ArrowRight size={15}/></Link></div></div></article>)}</div></div>
}
