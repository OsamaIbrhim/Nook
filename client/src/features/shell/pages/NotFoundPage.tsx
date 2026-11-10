export function NotFoundPage() {
  return (
    <div className="grid min-h-screen place-items-center bg-[#f2efe6] text-center">
      <div>
        <p className="text-xs font-black uppercase tracking-[.2em]">Page not found</p>
        <h1 className="text-8xl font-black tracking-[-.06em]">404</h1>
        <a href={import.meta.env.BASE_URL} className="btn-primary mt-5">
          Back home
        </a>
      </div>
    </div>
  )
}
