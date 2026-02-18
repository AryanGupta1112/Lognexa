import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import type { Incident, LogEntry } from '../lib/api'

const severityVariant: Record<string, string> = {
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
            Created {new Date(incident.created_at).toLocaleString()} · Status: {incident.status}
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
          <div className='space-y-3'>
            {logs.length === 0 && (
              <p className='text-sm text-muted-foreground'>No correlated logs found.</p>
            )}
            {logs.map((log) => (
              <div key={log.id} className='flex gap-3'>
                <div className='mt-1 h-2 w-2 rounded-full bg-primary' />
                <div>
                  <p className='text-sm font-medium'>
                    {log.service} · {log.level}
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

      <Card className='glass-panel'>
        <CardHeader>
          <CardTitle className='flex items-center justify-between'>
            <span>AI Explanation</span>
            <Button size='sm' onClick={onAnalyze} disabled={analyzing}>
              {analyzing ? 'Analyzing...' : 'Re-run AI analysis'}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-3'>
          <p className='text-sm text-muted-foreground'>Summary</p>
          <p className='text-sm'>{incident.ai_summary || 'No AI summary available yet.'}</p>

          <p className='text-sm text-muted-foreground'>Likely root cause</p>
          <p className='text-sm'>{incident.ai_root_cause || 'Awaiting analysis.'}</p>

          <p className='text-sm text-muted-foreground'>Recommended actions</p>
          <ul className='list-disc pl-5 text-sm'>
            {(incident.ai_actions || []).map((action, index) => (
              <li key={`${action}-${index}`}>{action}</li>
            ))}
            {(incident.ai_actions || []).length === 0 && <li>Configure an LLM to enable recommendations.</li>}
          </ul>

          <p className='text-sm text-muted-foreground'>Confidence</p>
          <p className='text-sm'>{incident.ai_confidence ?? 'N/A'}</p>
        </CardContent>
      </Card>
    </div>
  )
}
