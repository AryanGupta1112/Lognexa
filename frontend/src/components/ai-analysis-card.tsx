import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import type { LogEntry } from '../lib/api'
import type { BadgeProps } from './ui/badge'
import { formatDateTime } from '../lib/time'

const levelVariant: Record<string, NonNullable<BadgeProps['variant']>> = {
  ERROR: 'destructive',
  WARN: 'secondary',
  INFO: 'default',
  DEBUG: 'outline'
}

function cleanMessageForDisplay(message: string) {
  return message
    .replace(/\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?\b/, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

export function AiAnalysisCard({
  summary,
  rootCause,
  confidence,
  actions,
  relatedSignals,
  evidenceLogs,
  onAction,
  actionLabel = 'Re-run AI analysis',
  actionPending = false
}: {
  summary?: string | null
  rootCause?: string | null
  confidence?: number | null
  actions?: string[]
  relatedSignals?: string[]
  evidenceLogs: LogEntry[]
  onAction?: () => void
  actionLabel?: string
  actionPending?: boolean
}) {
  return (
    <div className='space-y-4'>
      <Card className='glass-panel'>
        <CardHeader>
          <CardTitle className='flex items-center justify-between gap-4'>
            <span>AI Explanation</span>
            {onAction ? (
              <Button size='sm' onClick={onAction} disabled={actionPending}>
                {actionPending ? 'Analyzing...' : actionLabel}
              </Button>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='space-y-1'>
            <p className='text-sm text-muted-foreground'>Summary</p>
            <p className='text-sm'>{summary || 'No AI summary available yet.'}</p>
          </div>

          <div className='space-y-1'>
            <p className='text-sm text-muted-foreground'>Likely root cause</p>
            <p className='text-sm'>{rootCause || 'Awaiting analysis.'}</p>
          </div>

          <div className='space-y-2'>
            <p className='text-sm text-muted-foreground'>Related signals</p>
            <div className='flex flex-wrap gap-2'>
              {(relatedSignals || []).map((signal, index) => (
                <Badge key={`${signal}-${index}`} variant='outline'>
                  {signal}
                </Badge>
              ))}
              {(relatedSignals || []).length === 0 ? (
                <p className='text-sm text-muted-foreground'>No related signals returned.</p>
              ) : null}
            </div>
          </div>

          <div className='space-y-1'>
            <p className='text-sm text-muted-foreground'>Recommended actions</p>
            <ul className='list-disc pl-5 text-sm'>
              {(actions || []).map((action, index) => (
                <li key={`${action}-${index}`}>{action}</li>
              ))}
              {(actions || []).length === 0 ? <li>No actions suggested yet.</li> : null}
            </ul>
          </div>

          <div className='space-y-1'>
            <p className='text-sm text-muted-foreground'>Confidence</p>
            <p className='text-sm'>{confidence ?? 'N/A'}</p>
          </div>
        </CardContent>
      </Card>

      <Card className='glass-panel'>
        <CardHeader>
          <CardTitle>Why did you say this?</CardTitle>
        </CardHeader>
        <CardContent className='space-y-3'>
          <p className='text-sm text-muted-foreground'>
            These are the direct supporting logs shown in the UI that were sent to the AI during analysis.
          </p>
          {evidenceLogs.length === 0 ? (
            <p className='text-sm text-muted-foreground'>No supporting logs are available for this analysis.</p>
          ) : (
            <div className='max-h-[24rem] space-y-3 overflow-y-auto pr-2'>
              {evidenceLogs.map((log) => (
                <div key={log.id} className='rounded-lg border border-border/60 bg-muted/30 p-3'>
                  <div className='mb-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground'>
                    <Badge variant={levelVariant[log.level] || 'default'}>{log.level}</Badge>
                    <span>{log.service}</span>
                    <span>{formatDateTime(log.timestamp)}</span>
                  </div>
                  <p className='text-sm'>{cleanMessageForDisplay(log.message)}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
