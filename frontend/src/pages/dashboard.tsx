import { useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { AlertCircle, Bug, Activity, ShieldAlert } from 'lucide-react'

import { getAllIncidents, getAllLogs } from '../lib/api'
import { useUiStore } from '../lib/store'
import { getTimeBounds, parseApiDate } from '../lib/time'
import { KpiCard } from '../components/kpi-card'
import {
  ErrorRateTrendChart,
  IncidentServiceChart,
  IncidentSeverityChart,
  LogLevelBreakdownChart,
  LogsOverTimeChart,
  ServiceVolumeChart,
} from '../components/charts'
import { Skeleton } from '../components/ui/skeleton'
import { toast } from 'sonner'

export function DashboardPage() {
  const selectedService = useUiStore((s) => s.selectedService)
  const timeRange = useUiStore((s) => s.timeRange)
  const customStart = useUiStore((s) => s.customStart)
  const customEnd = useUiStore((s) => s.customEnd)
  const search = useUiStore((s) => s.search)
  const normalizedSearch = search.trim()
  const { start, end } = getTimeBounds(timeRange, customStart, customEnd)

  const logsQuery = useQuery({
    queryKey: ['dashboard-logs', selectedService, timeRange, customStart, customEnd, normalizedSearch],
    queryFn: () =>
      getAllLogs({
        service: selectedService !== 'all' ? selectedService : undefined,
        q: normalizedSearch || undefined,
        start,
        end,
        limit: 500,
      }),
    refetchInterval: 10000,
  })

  const incidentsQuery = useQuery({
    queryKey: ['dashboard-incidents', selectedService, timeRange, customStart, customEnd, normalizedSearch],
    queryFn: () =>
      getAllIncidents({
        service: selectedService !== 'all' ? selectedService : undefined,
        q: normalizedSearch || undefined,
        start,
        end,
      }),
    refetchInterval: 10000,
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
    const errorRate = logs.length ? Math.round((errors / logs.length) * 100) : 0

    return {
      total: logs.length,
      errors,
      warnings,
      active,
      errorRate,
    }
  }, [logs, incidents])

  const logSeries = useMemo(() => {
    const buckets: Record<string, { time: string; total: number; errors: number }> = {}
    if (logs.length === 0) return []

    const timestamps = logs.map((log) => parseApiDate(log.timestamp).getTime()).filter((value) => !Number.isNaN(value))
    const minTs = Math.min(...timestamps)
    const maxTs = Math.max(...timestamps)
    const spanMs = Math.max(maxTs - minTs, 0)

    let bucketMs = 60 * 1000
    if (spanMs > 45 * 24 * 60 * 60 * 1000) bucketMs = 6 * 60 * 60 * 1000
    else if (spanMs > 14 * 24 * 60 * 60 * 1000) bucketMs = 2 * 60 * 60 * 1000
    else if (spanMs > 7 * 24 * 60 * 60 * 1000) bucketMs = 60 * 60 * 1000
    else if (spanMs > 3 * 24 * 60 * 60 * 1000) bucketMs = 30 * 60 * 1000
    else if (spanMs > 24 * 60 * 60 * 1000) bucketMs = 15 * 60 * 1000
    else if (spanMs > 6 * 60 * 60 * 1000) bucketMs = 5 * 60 * 1000

    logs.forEach((log) => {
      const date = parseApiDate(log.timestamp)
      const bucketTs = Math.floor(date.getTime() / bucketMs) * bucketMs
      const key = new Date(bucketTs).toISOString()

      if (!buckets[key]) {
        buckets[key] = { time: key, total: 0, errors: 0 }
      }

      buckets[key].total += 1
      if (log.level === 'ERROR') buckets[key].errors += 1
    })

    return Object.values(buckets)
      .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
  }, [logs])

  const errorRateSeries = useMemo(
    () =>
      logSeries.map((point) => ({
        time: point.time,
        errorRate: point.total ? Math.round((point.errors / point.total) * 100) : 0,
      })),
    [logSeries],
  )

  const serviceVolume = useMemo(() => {
    const map: Record<string, { service: string; total: number }> = {}

    logs.forEach((log) => {
      if (!map[log.service]) {
        map[log.service] = { service: log.service, total: 0 }
      }
      map[log.service].total += 1
    })

    return Object.values(map).sort((a, b) => b.total - a.total)
  }, [logs])

  const levelBreakdown = useMemo(() => {
    const map: Record<string, number> = { INFO: 0, WARN: 0, ERROR: 0, DEBUG: 0 }

    logs.forEach((log) => {
      const level = (log.level || 'INFO').toUpperCase()
      map[level] = (map[level] || 0) + 1
    })

    return Object.entries(map).map(([level, value]) => ({ level, value }))
  }, [logs])

  const severityDistribution = useMemo(() => {
    const map: Record<string, number> = { high: 0, medium: 0, low: 0 }
    incidents.forEach((incident) => {
      map[incident.severity] = (map[incident.severity] || 0) + 1
    })
    return Object.entries(map).map(([name, value]) => ({ name, value }))
  }, [incidents])

  const incidentServiceDistribution = useMemo(() => {
    const map: Record<string, number> = {}
    incidents.forEach((incident) => {
      const services = incident.services?.length ? incident.services : ['unknown']
      const uniqueServices = Array.from(new Set(services))
      uniqueServices.forEach((service) => {
        map[service] = (map[service] || 0) + 1
      })
    })
    return Object.entries(map).map(([service, incidents]) => ({ service, incidents }))
  }, [incidents])

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className='space-y-6'>
      <div>
        <h1 className='text-2xl font-semibold tracking-tight'>Dashboard</h1>
        <p className='mt-1 text-sm text-muted-foreground'>
          A simple view of system health for non-technical users. Focus on rising errors, open incidents, and unusual spikes.
        </p>
      </div>

      <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
        <KpiCard title='Total Logs' value={String(metrics.total)} icon={<Activity className='h-5 w-5' />} trend='How much activity was recorded.' />
        <KpiCard title='Error Logs' value={String(metrics.errors)} icon={<AlertCircle className='h-5 w-5' />} trend={`Error share: ${metrics.errorRate}%`} />
        <KpiCard title='Warning Logs' value={String(metrics.warnings)} icon={<Bug className='h-5 w-5' />} trend='Early signals before failures.' />
        <KpiCard title='Open Incidents' value={String(metrics.active)} icon={<ShieldAlert className='h-5 w-5' />} trend='Issues currently being tracked.' />
      </div>

      <div className='grid gap-6 xl:grid-cols-2'>
        {logsQuery.isLoading ? <Skeleton className='h-80' /> : <LogsOverTimeChart data={logSeries} />}
        {logsQuery.isLoading ? <Skeleton className='h-80' /> : <ErrorRateTrendChart data={errorRateSeries} />}
        {logsQuery.isLoading ? <Skeleton className='h-80' /> : <ServiceVolumeChart data={serviceVolume} />}
        {logsQuery.isLoading ? <Skeleton className='h-80' /> : <LogLevelBreakdownChart data={levelBreakdown} />}
        {incidentsQuery.isLoading ? <Skeleton className='h-80' /> : <IncidentSeverityChart data={severityDistribution} />}
        {incidentsQuery.isLoading ? <Skeleton className='h-80' /> : <IncidentServiceChart data={incidentServiceDistribution} />}
      </div>
    </motion.div>
  )
}
