function formatINRRaw(n: number): string {
  const s = String(Math.round(Math.abs(n)))
  if (s.length <= 3) return s
  const last3 = s.slice(-3)
  const rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',')
  return rest + ',' + last3
}

export function formatINR(n: number): string {
  return (n < 0 ? '-' : '') + formatINRRaw(n)
}

export function rupees(n: number, symbol = '₹'): string {
  return symbol + formatINR(n)
}

export function compactINR(n: number, symbol = '₹'): string {
  if (n >= 10_000_000)
    return symbol + (n / 10_000_000).toFixed(n % 10_000_000 ? 2 : 0).replace(/\.?0+$/, '') + ' Cr'
  if (n >= 1_000)
    return symbol + (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K'
  return symbol + n
}

// Decomposed for BidHero's styled display — always shows full number with commas
export function formatBidDisplay(n: number, symbol = '₹'): { sym: string; val: string; unit: string } {
  return { sym: symbol, val: formatINR(n), unit: '' }
}

export function speakAmount(n: number): string {
  if (n >= 10_000_000 && n % 10_000_000 === 0) {
    const cr = n / 10_000_000
    return cr + (cr === 1 ? ' crore' : ' crore')
  }
  if (n >= 100_000) {
    const cr = Math.floor(n / 10_000_000)
    const lakh = Math.floor((n % 10_000_000) / 100_000)
    const rest = n % 100_000
    const parts: string[] = []
    if (cr) parts.push(cr + ' crore')
    if (lakh) parts.push(lakh + ' lakh')
    if (rest) parts.push(formatINR(rest))
    return parts.join(' ')
  }
  return formatINR(n)
}

export function simTime(min: number): string {
  const total = 19 * 60 + (min || 0)
  let h = Math.floor(total / 60) % 24
  const m = total % 60
  const ap = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${h}:${String(m).padStart(2, '0')} ${ap}`
}
