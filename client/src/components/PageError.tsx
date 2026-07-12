import { AlertCircle, RotateCcw } from 'lucide-react'

export function PageError({ message, retry }: { message: string; retry?: () => void }) {
  return <div role="alert" className="rounded-2xl border border-red-100 bg-red-50 px-5 py-8 text-center"><AlertCircle className="mx-auto text-red-500"/><h2 className="mt-3 font-bold text-red-900">We couldn’t load this content</h2><p className="mx-auto mt-1 max-w-md text-sm text-red-700">{message}</p>{retry && <button onClick={retry} className="btn-secondary mt-5 !border-red-200 !bg-white text-red-700"><RotateCcw size={15}/> Try again</button>}</div>
}
