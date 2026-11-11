export function StatusBadge({ value }: { value: string }) {
  return (
    <span className="inline-flex rounded-[2px] border border-ink-muted px-2 py-1 text-eyebrow font-medium uppercase text-ink">
      {value}
    </span>
  )
}
