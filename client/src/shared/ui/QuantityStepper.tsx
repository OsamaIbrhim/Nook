import { Minus, Plus } from 'lucide-react'

const stepButton = 'grid size-11 place-items-center disabled:cursor-not-allowed disabled:opacity-45'

export function QuantityStepper({
  itemName,
  value,
  max,
  disabled = false,
  onChange
}: {
  itemName: string
  value: number
  max?: number
  disabled?: boolean
  onChange: (value: number) => void
}) {
  return (
    <div className="flex w-fit items-center border border-line-strong">
      <button
        type="button"
        className={stepButton}
        aria-label={`Decrease quantity of ${itemName}`}
        disabled={disabled || value <= 1}
        onClick={() => onChange(value - 1)}
      >
        <Minus size={16} strokeWidth={1.5} />
      </button>
      <span className="w-8 text-center tabular-nums" aria-label={`Quantity of ${itemName}`}>
        {value}
      </span>
      <button
        type="button"
        className={stepButton}
        aria-label={`Increase quantity of ${itemName}`}
        disabled={disabled || (max !== undefined && value >= max)}
        onClick={() => onChange(value + 1)}
      >
        <Plus size={16} strokeWidth={1.5} />
      </button>
    </div>
  )
}
