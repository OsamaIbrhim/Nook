import { AlertCircle } from 'lucide-react'

export function PageError({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div role="alert" className="bg-paper-sunken px-6 py-10">
      <h2 className="flex items-center gap-3 text-h3">
        <AlertCircle size={20} strokeWidth={1.5} className="shrink-0 text-danger" aria-hidden="true" />
        We couldn’t load this.
      </h2>
      <p className="mt-3 max-w-md text-ink-muted">{message}</p>
      {retry && (
        <button type="button" onClick={retry} className="btn-secondary mt-6">
          Try again
        </button>
      )}
    </div>
  )
}
