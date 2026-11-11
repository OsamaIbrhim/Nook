import { DollarSign, Package, ReceiptText, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { errorMessage } from '../../../shared/http/errors'
import { adminApi } from '../api'
import { PageError } from '../../../shared/ui/PageError'
import { StatsSkeleton } from '../../../shared/ui/Skeletons'
import { useMoney } from '../../policy'

type Stats = { users: number; products: number; orders: number; revenue: number }

export function DashboardPage() {
  const money = useMoney()
  const [stats, setStats] = useState<Stats>({ users: 0, products: 0, orders: 0, revenue: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const load = () => {
    setLoading(true)
    adminApi
      .get<Stats>('/admin/stats')
      .then((data) => {
        setStats(data)
        setError('')
      })
      .catch((reason) => setError(errorMessage(reason)))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])
  const cards = [
    [DollarSign, 'Revenue', money(stats.revenue), 'bg-emerald-100 text-emerald-700'],
    [ReceiptText, 'Total orders', stats.orders, 'bg-blue-100 text-blue-700'],
    [Users, 'Customers', stats.users, 'bg-violet-100 text-violet-700'],
    [Package, 'Active products', stats.products, 'bg-amber-100 text-amber-700']
  ] as const
  return (
    <>
      <div>
        <p className="text-sm text-black/45">Store performance</p>
        <h1 className="text-3xl font-black tracking-tight">Dashboard overview</h1>
      </div>
      {loading ? (
        <StatsSkeleton />
      ) : error ? (
        <div className="mt-8">
          <PageError message={error} retry={load} />
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map(([Icon, label, value, color]) => (
            <div className="card p-6" key={label}>
              <div className={`grid size-11 place-items-center rounded-xl ${color}`}>
                <Icon size={21} />
              </div>
              <p className="mt-5 text-sm text-black/45">{label}</p>
              <p className="mt-1 text-3xl font-black">{value}</p>
            </div>
          ))}
        </div>
      )}
      <div className="card mt-7 overflow-hidden p-5 sm:p-8">
        <div className="flex min-h-44 items-center justify-center rounded-2xl bg-gradient-to-br from-mint to-cream px-4 text-center sm:min-h-52">
          <div>
            <p className="text-xl font-black sm:text-2xl">Your store at a glance</p>
            <p className="mt-2 text-sm text-black/50">Revenue reflects successfully paid orders.</p>
          </div>
        </div>
      </div>
    </>
  )
}
