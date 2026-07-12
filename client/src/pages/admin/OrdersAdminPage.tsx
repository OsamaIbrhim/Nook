import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { api, errorMessage } from '../../api/client'
import { PageError } from '../../components/PageError'
import { Pagination } from '../../components/Pagination'
import { TableSkeleton } from '../../components/Skeletons'
import { StatusBadge } from '../../components/StatusBadge'
import type { ApiResponse, Order, OrderStatus, Pagination as PaginationType } from '../../types'
import { date, money } from '../../utils/format'

const transitions: Record<OrderStatus, OrderStatus[]> = { pending: ['processing', 'cancelled'], processing: ['shipped', 'cancelled'], shipped: ['delivered'], delivered: [], cancelled: [] }

function StatusControl({ order, update }: { order: Order; update: (id: string, value: OrderStatus) => void }) {
  const available = transitions[order.status].filter((status) => status !== 'processing' || order.paymentStatus === 'paid')
  return <select aria-label={`Update order ${order._id}`} disabled={!available.length} className="rounded-lg border border-black/10 bg-white p-2 text-xs disabled:opacity-50" value="" onChange={(event) => update(order._id, event.target.value as OrderStatus)}><option value="">Change…</option>{available.map((status) => <option value={status} key={status}>{status}</option>)}</select>
}

export function OrdersAdminPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [pagination, setPagination] = useState<PaginationType>()
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const load = useCallback(() => {
    setLoading(true)
    api.get<ApiResponse<{ orders: Order[]; pagination: PaginationType }>>(`/orders?page=${page}&limit=15&status=${status}`)
      .then((response) => { setOrders(response.data.data.orders); setPagination(response.data.data.pagination); setError('') })
      .catch((reason) => setError(errorMessage(reason)))
      .finally(() => setLoading(false))
  }, [page, status])
  useEffect(() => { load() }, [load])
  const update = async (id: string, value: OrderStatus) => {
    try { await api.patch(`/orders/${id}/status`, { status: value }); toast.success('Order status updated'); load() }
    catch (reason) { toast.error(errorMessage(reason)) }
  }
  return <>
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm text-black/45">Fulfillment</p><h1 className="text-3xl font-black">Orders</h1></div><select className="field !w-auto" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1) }}><option value="">All statuses</option>{Object.keys(transitions).map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
    <div className="card mt-7 overflow-hidden">{loading ? <TableSkeleton/> : error ? <div className="p-4"><PageError message={error} retry={load}/></div> : <>
      <div className="hidden overflow-x-auto md:block"><table className="w-full min-w-220 text-left text-sm"><thead className="bg-[#fafaf8] text-xs uppercase tracking-wider text-black/40"><tr><th className="p-4">Order</th><th>Customer</th><th>Date</th><th>Total</th><th>Payment</th><th>Status</th><th className="pr-4">Update</th></tr></thead><tbody className="divide-y divide-black/5">{orders.map((order) => <tr key={order._id}><td className="p-4 font-mono text-xs">#{order._id.slice(-8).toUpperCase()}</td><td><b>{typeof order.user === 'object' ? order.user.name : 'Customer'}</b><p className="text-xs text-black/40">{typeof order.user === 'object' ? order.user.email : ''}</p></td><td>{date(order.createdAt)}</td><td className="font-semibold">{money(order.total, order.currency)}</td><td><StatusBadge value={order.paymentStatus}/></td><td><StatusBadge value={order.status}/></td><td className="pr-4"><StatusControl order={order} update={update}/></td></tr>)}</tbody></table></div>
      <div className="divide-y divide-black/6 md:hidden">{orders.map((order) => <article key={order._id} className="space-y-4 p-4"><div className="flex items-start justify-between"><div><p className="font-mono text-xs text-black/45">#{order._id.slice(-8).toUpperCase()}</p><b>{typeof order.user === 'object' ? order.user.name : 'Customer'}</b></div><b>{money(order.total, order.currency)}</b></div><div className="flex flex-wrap gap-2"><StatusBadge value={order.paymentStatus}/><StatusBadge value={order.status}/></div><div className="flex items-center justify-between"><span className="text-xs text-black/45">{date(order.createdAt)}</span><StatusControl order={order} update={update}/></div></article>)}</div>
      {!orders.length && <p className="p-12 text-center text-black/40">No orders found.</p>}
    </>}</div>
    {pagination && !loading && !error && <Pagination page={page} pages={pagination.pages} onChange={setPage}/>} 
  </>
}
