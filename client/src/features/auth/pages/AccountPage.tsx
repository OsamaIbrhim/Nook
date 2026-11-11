import { Link, useNavigate } from 'react-router-dom'
import { useLogoutMutation } from '../api'
import { useSession } from '../useSession'

export function AccountPage() {
  const user = useSession().user!
  const [logout] = useLogoutMutation()
  const navigate = useNavigate()
  const signOut = async () => {
    await logout()
    navigate('/')
  }
  return (
    <div className="container-app pb-(--section-gap) pt-10 sm:pt-14">
      <p className="eyebrow">Account</p>
      <h1 className="mt-3 text-h1 tracking-[-0.015em]">{user.name}</h1>
      <p className="mt-4 text-ink-muted">{user.email}</p>
      <div className="mt-10 max-w-xl border-t border-line">
        <Link to="/orders" className="flex min-h-14 items-center justify-between border-b border-line">
          Your orders <span aria-hidden="true">→</span>
        </Link>
        {user.role === 'admin' && (
          <Link to="/admin" className="flex min-h-14 items-center justify-between border-b border-line">
            Admin <span aria-hidden="true">→</span>
          </Link>
        )}
      </div>
      <button type="button" onClick={signOut} className="btn-secondary mt-10">
        Sign out
      </button>
    </div>
  )
}
