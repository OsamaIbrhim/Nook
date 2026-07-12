export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return <div aria-label="Loading products" className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">{Array.from({ length: count }, (_, index) => <div key={index} className="overflow-hidden rounded-2xl bg-white ring-1 ring-black/5"><div className="aspect-[4/5] animate-pulse bg-black/6"/><div className="space-y-3 p-4"><div className="h-2 w-1/3 animate-pulse rounded bg-black/8"/><div className="h-4 w-3/4 animate-pulse rounded bg-black/8"/><div className="h-4 w-1/2 animate-pulse rounded bg-black/8"/></div></div>)}</div>
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return <div aria-label="Loading data" className="space-y-2 p-4">{Array.from({ length: rows }, (_, index) => <div key={index} className="h-16 animate-pulse rounded-xl bg-black/5"/>)}</div>
}

export function StatsSkeleton() {
  return <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className="card h-44 animate-pulse bg-white/70"/>)}</div>
}
