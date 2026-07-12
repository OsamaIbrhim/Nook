import { PackageOpen } from 'lucide-react'
import type { ReactNode } from 'react'
export function EmptyState({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return <div className="card flex flex-col items-center px-6 py-16 text-center"><div className="mb-4 grid size-14 place-items-center rounded-full bg-mint"><PackageOpen className="text-forest" /></div><h2 className="text-xl font-bold">{title}</h2><p className="mt-2 max-w-md text-sm text-black/55">{text}</p>{action && <div className="mt-6">{action}</div>}</div>
}
