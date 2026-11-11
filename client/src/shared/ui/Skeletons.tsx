export const productGridClass = 'grid grid-cols-2 gap-x-(--grid-gap) gap-y-10 md:grid-cols-3 xl:grid-cols-4'

export function ProductGridSkeleton({
  count = 8,
  className = productGridClass
}: {
  count?: number
  className?: string
}) {
  return (
    <div aria-label="Loading products" className={className}>
      {Array.from({ length: count }, (_, index) => (
        <div key={index}>
          <div className="plate aspect-[4/5]" />
          <div className="space-y-2 pt-3">
            <div className="h-3 w-1/3 bg-paper-sunken" />
            <div className="h-4 w-3/4 bg-paper-sunken" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div aria-label="Loading data" className="space-y-2 p-4">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="h-16 bg-paper-sunken" />
      ))}
    </div>
  )
}

export function StatsSkeleton() {
  return (
    <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="h-44 bg-paper-sunken" />
      ))}
    </div>
  )
}
