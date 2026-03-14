export function parseApiDate(value: string): Date {
  const hasTimezone = /([zZ]|[+-]\d{2}:\d{2})$/.test(value)
  const normalized = hasTimezone ? value : `${value}Z`
  return new Date(normalized)
}

function localInputToIso(value: string): string | undefined {
  if (!value) return undefined
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return undefined
  return parsed.toISOString()
}

export function rangeToStart(range: string): string | undefined {
  const now = new Date()
  const ranges: Record<string, number> = {
    '15m': 15 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '6h': 6 * 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
  }
  const delta = ranges[range]
  if (!delta) return undefined
  return new Date(now.getTime() - delta).toISOString()
}

export function getTimeBounds(range: string, customStart?: string, customEnd?: string) {
  if (range === 'custom') {
    return {
      start: localInputToIso(customStart || ''),
      end: localInputToIso(customEnd || ''),
    }
  }

  return {
    start: rangeToStart(range),
    end: undefined,
  }
}

export function formatShortTime(iso: string) {
  const date = parseApiDate(iso)
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })
}

export function formatDateTime(iso: string) {
  const date = parseApiDate(iso)
  return date.toLocaleString([], {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  })
}
