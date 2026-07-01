interface TeamBadgeProps {
  abbreviation: string
  color: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeMap = {
  sm: { w: 36, text: 12 },
  md: { w: 52, text: 15 },
  lg: { w: 72, text: 20 },
}

export function TeamBadge({ abbreviation, color, size = 'md', className }: TeamBadgeProps) {
  const { w, text } = sizeMap[size]
  return (
    <div
      className={className}
      style={{
        width: w,
        height: w,
        borderRadius: 6,
        background: color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 800,
        fontSize: text,
        color: '#fff',
        textShadow: '0 1px 2px rgba(0,0,0,.5)',
        flexShrink: 0,
        letterSpacing: '-0.5px',
      }}
    >
      {abbreviation}
    </div>
  )
}
