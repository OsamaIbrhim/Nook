import { Check, ChevronDown } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'

type Option = { value: string; label: string }

type SelectMenuProps = {
  label: string
  value: string
  options: Option[]
  onChange: (value: string) => void
  className?: string
}

export function SelectMenu({ label, value, options, onChange, className = '' }: SelectMenuProps) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const id = useId()
  const selected = options.find((option) => option.value === value) || options[0]

  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', outside)
    window.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('pointerdown', outside)
      window.removeEventListener('keydown', escape)
    }
  }, [])

  return <div ref={root} className={`relative ${className}`}>
    <button type="button" id={id} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((value) => !value)} className={`flex min-h-12 w-full items-center justify-between gap-4 border border-black/12 bg-white/65 px-4 text-left text-sm font-bold transition hover:border-black/35 hover:bg-white ${open ? 'border-black bg-white shadow-[0_14px_35px_rgba(0,0,0,.12)]' : ''}`}>
      <span><span className="mr-2 text-[9px] font-black uppercase tracking-[.16em] text-black/38">{label}</span>{selected.label}</span>
      <ChevronDown size={16} className={`shrink-0 transition duration-300 ${open ? 'rotate-180' : ''}`}/>
    </button>
    <div role="listbox" aria-labelledby={id} className={`absolute inset-x-0 top-[calc(100%+8px)] z-30 origin-top border border-black/12 bg-[#f7f4ec] p-1.5 shadow-[0_24px_60px_rgba(0,0,0,.18)] transition duration-200 ${open ? 'visible translate-y-0 scale-100 opacity-100' : 'invisible -translate-y-2 scale-[.98] opacity-0'}`}>
      {options.map((option) => <button type="button" role="option" aria-selected={option.value === value} key={option.value} onClick={() => { onChange(option.value); setOpen(false) }} className={`flex min-h-11 w-full items-center justify-between px-3 text-left text-sm transition hover:bg-black hover:text-white ${option.value === value ? 'bg-[#d7ff39] font-black text-black' : 'font-medium'}`}><span>{option.label}</span>{option.value === value && <Check size={14}/>}</button>)}
    </div>
  </div>
}
