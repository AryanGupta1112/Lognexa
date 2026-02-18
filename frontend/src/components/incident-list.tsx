import { Link, useRouterState } from '@tanstack/react-router'
import { Badge } from './ui/badge'
import type { Incident } from '../lib/api'
import { cn } from '../lib/utils'

const severityVariant: Record<string, string> = {
  high: 'destructive',
  medium: 'secondary',
  low: 'outline'
}

export function IncidentList({ incidents }: { incidents: Incident[] }) {
  const location = useRouterState({ select: (s) => s.location })
  return (
    <div className='space-y-3'>
      {incidents.map((incident) => {
        const active = location.pathname.endsWith(`/incidents/${incident.id}`)
        return (
          <Link
            key={incident.id}
            to={`/incidents/${incident.id}`}
            className={cn(
              'block rounded-lg border border-border/60 p-4 transition hover:bg-muted/30',
              active && 'bg-muted/40'
            )}
          >
            <div className='flex items-center justify-between gap-3'>
              <div>
                <p className='text-sm font-medium'>{incident.title}</p>
                <p className='text-xs text-muted-foreground'>
                  {incident.services.join(', ') || 'Unknown'} · {new Date(incident.created_at).toLocaleString()}
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
    </div>
  )
}
