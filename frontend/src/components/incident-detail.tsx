import { Badge } from './ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import type { Incident, LogEntry } from '../lib/api'
import type { BadgeProps } from './ui/badge'
import { AiAnalysisCard } from './ai-analysis-card'

const severityVariant: Record<string, NonNullable<BadgeProps['variant']>> = {
  high: 'destructive',
  medium: 'secondary',
  low: 'outline'
}

export function IncidentDetail({
  incident,
  logs,
  onAnalyze,
  analyzing
}: {
  incident: Incident
  logs: LogEntry[]
  onAnalyze: () => void
  analyzing: boolean
}) {
  return (
    <div className='space-y-4'>
      <Card className='glass-panel'>
        <CardHeader>
          <CardTitle className='flex items-center justify-between'>
            <span>{incident.title}</span>
            <Badge variant={severityVariant[incident.severity] || 'default'}>{incident.severity}</Badge>
          </CardTitle>
          <p className='text-xs text-muted-foreground'>
            Created {new Date(incident.created_at).toLocaleString()} - Status: {incident.status}
          </p>
        </CardHeader>
        <CardContent className='space-y-2'>
          <p className='text-sm text-muted-foreground'>Affected services</p>
          <div className='flex flex-wrap gap-2'>
            {incident.services.map((service) => (
              <Badge key={service} variant='outline'>
                {service}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className='glass-panel'>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='max-h-[28rem] space-y-3 overflow-y-auto pr-2'>
            {logs.length === 0 && (
              <p className='text-sm text-muted-foreground'>No correlated logs found.</p>
            )}
            {logs.map((log) => (
              <div key={log.id} className='flex gap-3'>
                <div className='mt-1 h-2 w-2 rounded-full bg-primary' />
                <div>
                  <p className='text-sm font-medium'>
                    {log.service} - {log.level}
                  </p>
                  <p className='text-xs text-muted-foreground'>
                    {new Date(log.timestamp).toLocaleString()}
                  </p>
                  <p className='text-sm'>{log.message}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <AiAnalysisCard
        summary={incident.ai_summary}
        rootCause={incident.ai_root_cause}
        confidence={incident.ai_confidence}
        actions={incident.ai_actions}
        relatedSignals={incident.ai_related_signals}
        evidenceLogs={logs}
        onAction={onAnalyze}
        actionPending={analyzing}
      />
    </div>
  )
}
