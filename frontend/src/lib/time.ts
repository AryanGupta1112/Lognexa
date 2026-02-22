export function rangeToStart(range: string): string | undefined {
  const now = new Date()
  const ranges: Record<string, number> = {
    '15m': 15 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '6h': 6 * 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000
  }
  const delta = ranges[range]
  if (!delta) return undefined
  return new Date(now.getTime() - delta).toISOString()
}

export function formatShortTime(iso: string) {
  const date = new Date(iso)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
