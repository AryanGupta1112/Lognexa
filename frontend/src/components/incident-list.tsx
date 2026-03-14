import { Link, useRouterState } from '@tanstack/react-router'
import { Badge } from './ui/badge'
import type { Incident } from '../lib/api'
import { cn } from '../lib/utils'
import type { BadgeProps } from './ui/badge'
import { formatDateTime } from '../lib/time'

const severityVariant: Record<string, NonNullable<BadgeProps['variant']>> = {
  high: 'destructive',
  medium: 'secondary',
  low: 'outline'
}

export function IncidentList({
  incidents,
  hasMore,
  isFetchingMore,
  onLoadMore,
}: {
  incidents: Incident[]
  hasMore: boolean
  isFetchingMore: boolean
  onLoadMore: () => void
}) {
  const location = useRouterState({ select: (s) => s.location })
  return (
    <div
      className='max-h-[calc(100vh-12rem)] space-y-3 overflow-y-auto pr-1'
      onScroll={(event) => {
        const target = event.currentTarget
        const nearBottom = target.scrollTop + target.clientHeight >= target.scrollHeight - 120
        if (nearBottom && hasMore && !isFetchingMore) onLoadMore()
      }}
    >
      {incidents.map((incident) => {
        const active = location.pathname.endsWith(`/incidents/${incident.id}`)
        return (
          <Link
            key={incident.id}
            to='/incidents/$incidentId'
            params={{ incidentId: String(incident.id) }}
            className={cn(
              'block rounded-lg border border-border/60 p-4 transition hover:bg-muted/30',
              active && 'bg-muted/40'
            )}
          >
            <div className='flex items-center justify-between gap-3'>
              <div>
                <p className='text-sm font-medium'>{incident.title}</p>
                <p className='text-xs text-muted-foreground'>
                  {incident.services.join(', ') || 'Unknown'} - {formatDateTime(incident.created_at)}
                </p>
              </div>
              <Badge variant={severityVariant[incident.severity] || 'default'}>{incident.severity}</Badge>
            </div>
          </Link>
        )
      })}
      {incidents.length === 0 && (
        <div className='rounded-lg border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground'>
          No incidents detected in this window.
        </div>
      )}
      {isFetchingMore ? (
        <div className='rounded-lg border border-border/40 px-3 py-2 text-xs text-muted-foreground'>
          Loading more incidents...
        </div>
      ) : null}
    </div>
  )
}
