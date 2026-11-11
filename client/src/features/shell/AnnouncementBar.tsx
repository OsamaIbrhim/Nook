import { Link } from 'react-router-dom'
import { announcementCopy, usePolicy } from '../policy'

export function AnnouncementBar() {
  const policy = usePolicy()
  return (
    <div className="surface-inverse flex h-(--announce-h) items-center justify-center px-(--page-margin)">
      <Link to="/products" className="truncate text-eyebrow font-medium uppercase">
        {policy ? (
          <>
            <span className="sm:hidden">{announcementCopy({ ...policy, returnWindowDays: 0 })}</span>
            <span className="hidden sm:inline">{announcementCopy(policy)}</span>
          </>
        ) : (
          ' '
        )}
      </Link>
    </div>
  )
}
