export function RouteFallback() {
  return <div className="container-app min-h-[62vh] py-10" aria-label="Loading page" role="status">
    <div className="h-1 w-28 animate-pulse bg-[#d7ff39]"/>
    <div className="mt-8 h-10 w-2/3 max-w-xl animate-pulse bg-black/8"/>
    <div className="mt-4 h-4 w-1/3 max-w-sm animate-pulse bg-black/6"/>
    <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className="aspect-[4/5] animate-pulse bg-black/5"/>)}</div>
    <span className="sr-only">Loading the next page…</span>
  </div>
}
