export function Spinner({ full = false }: { full?: boolean }) {
  return (
    <div className={full ? 'grid min-h-[55vh] place-items-center' : 'grid place-items-center py-12'}>
      <span
        role="status"
        aria-label="Loading"
        className="size-6 animate-spin rounded-full border border-line-strong border-t-ink motion-reduce:animate-none"
      />
    </div>
  )
}
