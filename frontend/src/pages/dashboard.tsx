import { useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { AlertCircle, Bug, Clock, Activity, ShieldCheck } from 'lucide-react'

import { getLogs, getIncidents } from '../lib/api'
import { useUiStore } from '../lib/store'
import { rangeToStart } from '../lib/time'
import { KpiCard } from '../components/kpi-card'
import { LogsOverTimeChart, ErrorsByServiceChart, IncidentSeverityChart } from '../components/charts'
import { Skeleton } from '../components/ui/skeleton'
import { toast } from 'sonner'

export function DashboardPage() {
  const selectedService = useUiStore((s) => s.selectedService)
  const timeRange = useUiStore((s) => s.timeRange)
  const start = rangeToStart(timeRange)

  const logsQuery = useQuery({
    queryKey: ['logs', selectedService, timeRange],
    queryFn: () =>
      getLogs({
        service: selectedService !== 'all' ? selectedService : undefined,
        start,
        limit: 500
      })
  })

  const incidentsQuery = useQuery({
    queryKey: ['incidents', selectedService, timeRange],
    queryFn: () =>
      getIncidents({
        service: selectedService !== 'all' ? selectedService : undefined,
        start
      })
  })

  useEffect(() => {
    if (logsQuery.isError) toast.error('Failed to load logs')
  }, [logsQuery.isError])

  useEffect(() => {
    if (incidentsQuery.isError) toast.error('Failed to load incidents')
  }, [incidentsQuery.isError])

  const logs = logsQuery.data || []
  const incidents = incidentsQuery.data || []

  const metrics = useMemo(() => {
    const errors = logs.filter((log) => log.level === 'ERROR').length
    const warnings = logs.filter((log) => log.level === 'WARN').length
    const active = incidents.filter((incident) => incident.status === 'open').length
    const mttrMinutes = incidents.length
      ? Math.round(
          incidents.reduce((sum, incident) => {
            const created = new Date(incident.created_at).getTime()
            const updated = new Date(incident.updated_at).getTime()
            return sum + Math.max(0, updated - created)
          }, 0) /
            incidents.length /
            60000
        )
      : 0

    return {
      total: logs.length,
      errors,
      warnings,
      active,
      mttrMinutes
    }
  }, [logs, incidents])

  const logSeries = useMemo(() => {
    const buckets: Record<string, { time: string; total: number; errors: number }> = {}
    logs.forEach((log) => {
      const date = new Date(log.timestamp)
      const key = new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes()).toISOString()
      if (!buckets[key]) {
        buckets[key] = { time: key, total: 0, errors: 0 }
      }
      buckets[key].total += 1
      if (log.level === 'ERROR') buckets[key].errors += 1
    })
    return Object.values(buckets).slice(-30)
  }, [logs])

  const errorsByService = useMemo(() => {
    const map: Record<string, number> = {}
    logs.forEach((log) => {
      if (log.level === 'ERROR') {
        map[log.service] = (map[log.service] || 0) + 1
      }
    })
    return Object.entries(map).map(([service, errors]) => ({ service, errors }))
  }, [logs])

  const severityDistribution = useMemo(() => {
    const map: Record<string, number> = { high: 0, medium: 0, low: 0 }
    incidents.forEach((incident) => {
      map[incident.severity] = (map[incident.severity] || 0) + 1
    })
    return Object.entries(map).map(([name, value]) => ({ name, value }))
  }, [incidents])

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-5'>
        <KpiCard title='Total Logs' value={String(metrics.total)} icon={<Activity className='h-5 w-5' />} />
        <KpiCard title='Errors' value={String(metrics.errors)} icon={<AlertCircle className='h-5 w-5' />} />
        <KpiCard title='Warnings' value={String(metrics.warnings)} icon={<Bug className='h-5 w-5' />} />
        <KpiCard title='Active Incidents' value={String(metrics.active)} icon={<ShieldCheck className='h-5 w-5' />} />
        <KpiCard title='MTTR Estimate' value={`${metrics.mttrMinutes}m`} icon={<Clock className='h-5 w-5' />} />
      </div>

      <div className='mt-6 grid gap-6 lg:grid-cols-3'>
        {logsQuery.isLoading ? (
          <Skeleton className='h-64' />
        ) : (
          <LogsOverTimeChart data={logSeries} />
        )}
        {logsQuery.isLoading ? (
          <Skeleton className='h-64' />
        ) : (
          <ErrorsByServiceChart data={errorsByService} />
        )}
        {incidentsQuery.isLoading ? (
          <Skeleton className='h-64' />
        ) : (
          <IncidentSeverityChart data={severityDistribution} />
        )}
      </div>
    </motion.div>
  )
}
