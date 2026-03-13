import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams } from '@tanstack/react-router'
import { toast } from 'sonner'

import { analyzeIncident, getIncident, getLogs } from '../lib/api'
import { IncidentDetail } from '../components/incident-detail'
import { parseApiDate } from '../lib/time'

export function IncidentDetailPage() {
  const params = useParams({ from: '/incidents/$incidentId' })
  const incidentId = Number(params.incidentId)
  const queryClient = useQueryClient()

  const incidentQuery = useQuery({
    queryKey: ['incident', incidentId],
    queryFn: () => getIncident(incidentId),
    enabled: Number.isFinite(incidentId)
  })

  const logsQuery = useQuery({
    queryKey: ['incident-logs', incidentId],
    queryFn: () => getLogs({ limit: 500 }),
    enabled: incidentQuery.isSuccess
  })

  const analyzeMutation = useMutation({
    mutationFn: () => analyzeIncident(incidentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incident', incidentId] })
      queryClient.invalidateQueries({ queryKey: ['incidents'] })
      toast.success('AI analysis updated')
    },
    onError: () => toast.error('Failed to analyze incident')
  })

  const incident = incidentQuery.data
  const logs = useMemo(() => {
    if (!incident || !logsQuery.data) return []
    const evidence = new Set(incident.evidence_log_ids || [])
    return logsQuery.data
      .filter((log) => evidence.has(log.id))
      .sort((a, b) => parseApiDate(a.timestamp).getTime() - parseApiDate(b.timestamp).getTime())
  }, [logsQuery.data, incident])

  if (incidentQuery.isLoading) {
    return <p className='text-sm text-muted-foreground'>Loading incident...</p>
  }

  if (incidentQuery.isError || !incident) {
    return <p className='text-sm text-muted-foreground'>Incident not found.</p>
  }

  return (
    <IncidentDetail
      incident={incident}
      logs={logs}
      onAnalyze={() => analyzeMutation.mutate()}
      analyzing={analyzeMutation.isPending}
    />
  )
}
