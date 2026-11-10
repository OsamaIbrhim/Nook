import { LogOut, Shield } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useLogoutMutation } from '../api'
import { useSession } from '../useSession'
export function AccountPage() {
  const user = useSession().user!
  const [logout] = useLogoutMutation()
  const nav = useNavigate()
  return (
    <div className="container-app py-12">
      <div className="card mx-auto max-w-2xl p-8">
        <div className="grid size-16 place-items-center rounded-full bg-mint text-2xl font-black text-forest">
          {user.name[0]}
        </div>
        <h1 className="mt-5 text-3xl font-black">{user.name}</h1>
        <p className="text-black/50">{user.email}</p>
        <div className="mt-7 flex items-center gap-3 rounded-xl bg-cream p-4 text-sm">
          <Shield className="text-forest" />
          <span className="capitalize">{user.role} account</span>
        </div>
        <button
          onClick={async () => {
            await logout()
            nav('/')
          }}
          className="btn-secondary mt-6 text-red-600"
        >
          <LogOut size={17} /> Sign out
        </button>
      </div>
    </div>
  )
}
