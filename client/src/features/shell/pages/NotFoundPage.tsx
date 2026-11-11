import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="container-app grid min-h-[70vh] place-items-center py-(--section-gap) text-center">
      <div>
        <p className="eyebrow">Error 404</p>
        <h1 className="mt-4 text-h1">We can’t find that page.</h1>
        <p className="mx-auto mt-5 max-w-md text-ink-muted">It may have moved, or the address may be mistyped.</p>
        <Link to="/products" className="btn-primary mt-8">
          Shop the collection
        </Link>
      </div>
    </div>
  )
}
