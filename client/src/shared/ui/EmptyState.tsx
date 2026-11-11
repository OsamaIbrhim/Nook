import type { ReactNode } from 'react'

export function EmptyState({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-20 text-center">
      <h2 className="text-h3">{title}</h2>
      <p className="mt-3 max-w-md text-ink-muted">{text}</p>
      {action && <div className="mt-8">{action}</div>}
    </div>
  )
}
