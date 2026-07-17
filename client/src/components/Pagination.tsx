import { ChevronLeft, ChevronRight } from 'lucide-react'

export function Pagination({ page, pages, onChange }: { page: number; pages: number; onChange: (page: number) => void }) {
  if (pages <= 1) return null
  const change = (nextPage: number) => {
    if (nextPage === page || nextPage < 1 || nextPage > pages) return
    onChange(nextPage)
    requestAnimationFrame(() => window.dispatchEvent(new Event('nook:scroll-top')))
  }
  return <nav aria-label="Product pagination" className="mt-10 flex items-center justify-center gap-3">
    <button className="btn-secondary !p-2.5" disabled={page === 1} onClick={() => change(page - 1)} aria-label="Previous page"><ChevronLeft size={18}/></button>
    <span className="min-w-24 text-center text-sm text-black/60" aria-live="polite">Page <b className="text-ink">{page}</b> of {pages}</span>
    <button className="btn-secondary !p-2.5" disabled={page === pages} onClick={() => change(page + 1)} aria-label="Next page"><ChevronRight size={18}/></button>
  </nav>
}
