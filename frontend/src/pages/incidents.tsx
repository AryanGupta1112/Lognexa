import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Outlet } from '@tanstack/react-router'
import { toast } from 'sonner'

import { getIncidents } from '../lib/api'
import { useUiStore } from '../lib/store'
import { rangeToStart } from '../lib/time'
import { IncidentList } from '../components/incident-list'
import { EmptyState } from '../components/empty-state'
import { Skeleton } from '../components/ui/skeleton'

export function IncidentsPage() {
  const selectedService = useUiStore((s) => s.selectedService)
  const timeRange = useUiStore((s) => s.timeRange)
  const start = rangeToStart(timeRange)

  const incidentsQuery = useQuery({
    queryKey: ['incidents', selectedService, timeRange],
    queryFn: () =>
      getIncidents({
        service: selectedService !== 'all' ? selectedService : undefined,
        start
      })
  })

  useEffect(() => {
    if (incidentsQuery.isError) toast.error('Failed to load incidents')
  }, [incidentsQuery.isError])

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      <div className='flex items-center justify-between mb-4'>
        <div>
          <h2 className='text-2xl font-semibold'>Incidents</h2>
          <p className='text-sm text-muted-foreground'>AI-assisted incident correlation and root cause context.</p>
        </div>
      </div>

      {incidentsQuery.isLoading ? (
        <Skeleton className='h-[520px]' />
      ) : incidentsQuery.data?.length === 0 ? (
        <EmptyState
          title='No incidents detected'
          description='As logs accumulate, LOGNEXA will surface incident clusters automatically.'
        />
      ) : (
        <div className='grid gap-6 lg:grid-cols-[320px_1fr]'>
          <IncidentList incidents={incidentsQuery.data || []} />
          <div className='min-h-[400px] rounded-lg border border-border/60 bg-muted/20 p-4'>
            <Outlet />
          </div>
        </div>
      )}
    </motion.div>
  )
}
