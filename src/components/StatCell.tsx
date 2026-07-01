interface StatCellProps {
  label: string
  value: string
  className?: string
}

export function StatCell({ label, value, className }: StatCellProps) {
  return (
    <div className={className} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontSize: '0.7em', opacity: 0.55, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </span>
      <span style={{ fontWeight: 700, fontSize: '1em' }}>{value}</span>
    </div>
  )
}
