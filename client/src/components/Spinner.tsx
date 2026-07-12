export function Spinner({ full = false }: { full?: boolean }) {
  return <div className={full ? 'grid min-h-[55vh] place-items-center' : 'grid place-items-center py-12'}><span className="size-8 animate-spin rounded-full border-3 border-forest/20 border-t-forest" aria-label="Loading" /></div>
}
