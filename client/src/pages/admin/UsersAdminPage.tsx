import { Search } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { api, errorMessage } from '../../api/client'
import { PageError } from '../../components/PageError'
import { Pagination } from '../../components/Pagination'
import { TableSkeleton } from '../../components/Skeletons'
import type { ApiResponse, Pagination as PaginationType, Role, User } from '../../types'
import { date } from '../../utils/format'
import { useDebouncedValue } from '../../utils/useDebouncedValue'

export function UsersAdminPage() {
  const [users, setUsers] = useState<User[]>([])
  const [pagination, setPagination] = useState<PaginationType>()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const debouncedSearch = useDebouncedValue(search)
  const load = useCallback(() => {
    setLoading(true)
    api.get<ApiResponse<{ users: User[]; pagination: PaginationType }>>(`/admin/users?page=${page}&limit=15&search=${encodeURIComponent(debouncedSearch)}`)
      .then((response) => { setUsers(response.data.data.users); setPagination(response.data.data.pagination); setError('') })
      .catch((reason) => setError(errorMessage(reason)))
      .finally(() => setLoading(false))
  }, [page, debouncedSearch])
  useEffect(() => { load() }, [load])
  const update = async (id: string, body: { role?: Role; isActive?: boolean }) => {
    try { await api.patch(`/admin/users/${id}`, body); toast.success('User updated'); load() }
    catch (reason) { toast.error(errorMessage(reason)) }
  }
  const controls = (user: User) => <div className="flex items-center gap-2"><select aria-label={`Role for ${user.name}`} className="rounded-lg border border-black/10 p-2 text-xs capitalize" value={user.role} onChange={(event) => update(user._id, { role: event.target.value as Role })}><option value="customer">Customer</option><option value="admin">Admin</option></select><button onClick={() => update(user._id, { isActive: !user.isActive })} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${user.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{user.isActive ? 'Active' : 'Disabled'}</button></div>
  return <>
    <div><p className="text-sm text-black/45">Accounts</p><h1 className="text-3xl font-black">Customers & users</h1></div>
    <div className="card mt-7 overflow-hidden"><div className="border-b border-black/5 p-4"><div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-black/35" size={17}/><input className="field !pl-10" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} placeholder="Search name or email"/></div></div>
      {loading ? <TableSkeleton/> : error ? <div className="p-4"><PageError message={error} retry={load}/></div> : <><div className="hidden overflow-x-auto md:block"><table className="w-full min-w-180 text-left text-sm"><thead className="bg-[#fafaf8] text-xs uppercase tracking-wider text-black/40"><tr><th className="p-4">User</th><th>Joined</th><th>Controls</th></tr></thead><tbody className="divide-y divide-black/5">{users.map((user) => <tr key={user._id}><td className="p-4"><b>{user.name}</b><p className="text-xs text-black/40">{user.email}</p></td><td>{date(user.createdAt)}</td><td>{controls(user)}</td></tr>)}</tbody></table></div><div className="divide-y divide-black/6 md:hidden">{users.map((user) => <article className="space-y-4 p-4" key={user._id}><div><b>{user.name}</b><p className="break-all text-xs text-black/40">{user.email}</p><p className="mt-1 text-xs text-black/40">Joined {date(user.createdAt)}</p></div>{controls(user)}</article>)}</div>{!users.length && <p className="p-12 text-center text-black/40">No users found.</p>}</>}
    </div>{pagination && !loading && !error && <Pagination page={page} pages={pagination.pages} onChange={setPage}/>} 
  </>
}
