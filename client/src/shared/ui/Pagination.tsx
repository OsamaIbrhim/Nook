export function Pagination({
  page,
  pages,
  onChange
}: {
  page: number
  pages: number
  onChange: (page: number) => void
}) {
  if (pages <= 1) return null
  const change = (nextPage: number) => {
    onChange(nextPage)
    window.scrollTo({ top: 0, behavior: 'instant' })
  }
  return (
    <nav aria-label="Pagination" className="mt-14 flex items-center justify-between border-t border-line pt-6">
      <button type="button" className="btn-secondary" disabled={page <= 1} onClick={() => change(page - 1)}>
        Previous
      </button>
      <p className="text-sm text-ink-muted" aria-live="polite">
        Page {page} of {pages}
      </p>
      <button type="button" className="btn-secondary" disabled={page >= pages} onClick={() => change(page + 1)}>
        Next
      </button>
    </nav>
  )
}
