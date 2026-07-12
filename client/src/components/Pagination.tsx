import { ChevronLeft, ChevronRight } from 'lucide-react'
export function Pagination({ page, pages, onChange }: { page: number; pages: number; onChange: (page: number) => void }) {
  if (pages <= 1) return null
  return <div className="mt-10 flex items-center justify-center gap-3"><button className="btn-secondary !p-2.5" disabled={page === 1} onClick={() => onChange(page - 1)} aria-label="Previous page"><ChevronLeft size={18}/></button><span className="text-sm text-black/60">Page <b className="text-ink">{page}</b> of {pages}</span><button className="btn-secondary !p-2.5" disabled={page === pages} onClick={() => onChange(page + 1)} aria-label="Next page"><ChevronRight size={18}/></button></div>
}
