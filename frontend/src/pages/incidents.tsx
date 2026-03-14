import { useEffect } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Outlet } from '@tanstack/react-router'
import { toast } from 'sonner'

import { getIncidents } from '../lib/api'
import { useUiStore } from '../lib/store'
import { getTimeBounds } from '../lib/time'
import { IncidentList } from '../components/incident-list'
import { EmptyState } from '../components/empty-state'
import { Skeleton } from '../components/ui/skeleton'

const PAGE_SIZE = 50

export function IncidentsPage() {
  const selectedService = useUiStore((s) => s.selectedService)
  const timeRange = useUiStore((s) => s.timeRange)
  const customStart = useUiStore((s) => s.customStart)
  const customEnd = useUiStore((s) => s.customEnd)
  const search = useUiStore((s) => s.search)
  const normalizedSearch = search.trim()
  const { start, end } = getTimeBounds(timeRange, customStart, customEnd)

  const incidentsQuery = useInfiniteQuery({
    queryKey: ['incidents', selectedService, timeRange, customStart, customEnd, normalizedSearch],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      getIncidents({
        service: selectedService !== 'all' ? selectedService : undefined,
        q: normalizedSearch || undefined,
        start,
        end,
        limit: PAGE_SIZE,
        offset: pageParam,
      }),
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length < PAGE_SIZE ? undefined : allPages.length * PAGE_SIZE,
    refetchInterval: 5000,
  })

  useEffect(() => {
    if (incidentsQuery.isError) toast.error('Failed to load incidents')
  }, [incidentsQuery.isError])

  const incidents = incidentsQuery.data?.pages.flat() || []

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      <div className='mb-4 flex items-center justify-between'>
        <div>
          <h2 className='text-2xl font-semibold'>Incidents</h2>
          <p className='text-sm text-muted-foreground'>AI-assisted incident correlation and root cause context.</p>
        </div>
      </div>

      {incidentsQuery.isLoading ? (
        <Skeleton className='h-[520px]' />
      ) : incidents.length === 0 ? (
        <EmptyState
          title='No incidents detected'
          description='As logs accumulate, LOGNEXA will surface incident clusters automatically.'
        />
      ) : (
        <div className='grid gap-6 lg:grid-cols-[320px_1fr]'>
          <IncidentList
            incidents={incidents}
            hasMore={Boolean(incidentsQuery.hasNextPage)}
            isFetchingMore={incidentsQuery.isFetchingNextPage}
            onLoadMore={() => {
              if (!incidentsQuery.hasNextPage || incidentsQuery.isFetchingNextPage) return
              incidentsQuery.fetchNextPage()
            }}
          />
          <div className='min-h-[400px] rounded-lg border border-border/60 bg-muted/20 p-4 lg:sticky lg:top-6 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto'>
            <Outlet />
          </div>
        </div>
      )}
    </motion.div>
  )
}
