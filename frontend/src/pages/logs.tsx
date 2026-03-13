import { useEffect, useMemo, useState } from 'react'
import { useInfiniteQuery, useMutation } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Code } from 'lucide-react'
import { toast } from 'sonner'
import CodeMirror from '@uiw/react-codemirror'
import { json as jsonLang } from '@codemirror/lang-json'
import { oneDark } from '@codemirror/theme-one-dark'
import { highlightSelectionMatches, SearchQuery, setSearchQuery, searchKeymap } from '@codemirror/search'
import { keymap } from '@codemirror/view'

import { analyzeSelectedLogs, createLogStream, getLogs, type LogEntry } from '../lib/api'
import { useUiStore } from '../lib/store'
import { formatDateTime, getTimeBounds, parseApiDate } from '../lib/time'
import { AiAnalysisCard } from '../components/ai-analysis-card'
import { EmptyState } from '../components/empty-state'
import { LogTable } from '../components/log-table'
import { Button } from '../components/ui/button'
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '../components/ui/drawer'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Skeleton } from '../components/ui/skeleton'

const PAGE_SIZE = 200
const ISO_TIMESTAMP_REGEX =
  /\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:[zZ]|[+-]\d{2}:\d{2})?\b/g

function localizeInlineTimestamps(value: string) {
  return value.replace(ISO_TIMESTAMP_REGEX, (match) => formatDateTime(match))
}

function localizePayloadTimestamps(value: unknown): unknown {
  if (typeof value === 'string') return localizeInlineTimestamps(value)
  if (Array.isArray(value)) return value.map((item) => localizePayloadTimestamps(item))
  if (!value || typeof value !== 'object') return value

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, nested]) => [
      key,
      localizePayloadTimestamps(nested),
    ]),
  )
}

function matchesLogSearch(log: LogEntry, term: string) {
  if (!term) return true
  const haystack = `${log.service} ${log.level} ${log.message} ${log.raw} ${log.container_id}`.toLowerCase()
  return haystack.includes(term)
}

export function LogsPage() {
  const selectedService = useUiStore((s) => s.selectedService)
  const timeRange = useUiStore((s) => s.timeRange)
  const customStart = useUiStore((s) => s.customStart)
  const customEnd = useUiStore((s) => s.customEnd)
  const search = useUiStore((s) => s.search)
  const normalizedSearch = search.trim().toLowerCase()
  const streaming = useUiStore((s) => s.streaming)
  const { start, end } = getTimeBounds(timeRange, customStart, customEnd)
  const [levelFilter, setLevelFilter] = useState('all')

  const logsQuery = useInfiniteQuery({
    queryKey: ['logs', selectedService, timeRange, customStart, customEnd, levelFilter, normalizedSearch],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      getLogs({
        service: selectedService !== 'all' ? selectedService : undefined,
        level: levelFilter !== 'all' ? levelFilter : undefined,
        q: normalizedSearch || undefined,
        start,
        end,
        limit: PAGE_SIZE,
        offset: pageParam,
      }),
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length < PAGE_SIZE ? undefined : allPages.length * PAGE_SIZE,
    refetchInterval: streaming ? 10000 : false,
  })

  const [streamedLogs, setStreamedLogs] = useState<LogEntry[]>([])
  const [selected, setSelected] = useState<LogEntry | null>(null)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [analysisOpen, setAnalysisOpen] = useState(false)
  const [editorView, setEditorView] = useState<any>(null)

  useEffect(() => {
    setStreamedLogs([])
    setSelectedIds([])
  }, [selectedService, timeRange, customStart, customEnd, levelFilter])

  useEffect(() => {
    if (logsQuery.isError) toast.error('Failed to load logs')
  }, [logsQuery.isError])

  useEffect(() => {
    if (!streaming) return

    const startMs = start ? parseApiDate(start).getTime() : null
    const endMs = end ? parseApiDate(end).getTime() : null

    const stop = createLogStream((log) => {
      if (selectedService !== 'all' && log.service !== selectedService) return
      if (levelFilter !== 'all' && log.level !== levelFilter) return
      if (!matchesLogSearch(log, normalizedSearch)) return

      const logMs = parseApiDate(log.timestamp).getTime()
      if (startMs && logMs < startMs) return
      if (endMs && logMs > endMs) return

      setStreamedLogs((prev) => {
        if (prev.some((item) => item.id === log.id)) return prev
        return [log, ...prev].slice(0, PAGE_SIZE)
      })
    })

    return stop
  }, [streaming, selectedService, levelFilter, normalizedSearch, start, end])

  useEffect(() => {
    if (!editorView) return
    if (!search) return
    const query = new SearchQuery({ search, caseSensitive: false })
    editorView.dispatch({ effects: setSearchQuery.of(query) })
  }, [editorView, search])

  const pagedLogs = useMemo(() => logsQuery.data?.pages.flat() ?? [], [logsQuery.data])

  const logs = useMemo(() => {
    const map = new Map<number, LogEntry>()

    for (const log of pagedLogs) {
      map.set(log.id, log)
    }

    for (const log of streamedLogs) {
      map.set(log.id, log)
    }

    return Array.from(map.values()).sort(
      (a, b) => parseApiDate(b.timestamp).getTime() - parseApiDate(a.timestamp).getTime(),
    )
  }, [pagedLogs, streamedLogs])

  useEffect(() => {
    const validIds = new Set(logs.map((log) => log.id))
    setSelectedIds((prev) => prev.filter((id) => validIds.has(id)))
  }, [logs])

  const filteredLogs = useMemo(() => {
    const startMs = start ? parseApiDate(start).getTime() : null
    const endMs = end ? parseApiDate(end).getTime() : null

    return logs.filter((log) => {
      if (selectedService !== 'all' && log.service !== selectedService) return false
      if (levelFilter !== 'all' && log.level !== levelFilter) return false
      if (!matchesLogSearch(log, normalizedSearch)) return false

      const logMs = parseApiDate(log.timestamp).getTime()
      if (startMs && logMs < startMs) return false
      if (endMs && logMs > endMs) return false

      return true
    })
  }, [logs, normalizedSearch, selectedService, levelFilter, start, end])

  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds])
  const selectedLogs = useMemo(
    () =>
      logs
        .filter((log) => selectedIdSet.has(log.id))
        .sort((a, b) => parseApiDate(a.timestamp).getTime() - parseApiDate(b.timestamp).getTime()),
    [logs, selectedIdSet],
  )

  const analyzeSelectionMutation = useMutation({
    mutationFn: () => analyzeSelectedLogs(selectedIds),
    onSuccess: () => {
      setAnalysisOpen(true)
      toast.success('Selected logs analyzed')
    },
    onError: () => toast.error('Failed to analyze selected logs'),
  })

  const toggleSelection = (logId: number) => {
    setSelectedIds((prev) => (prev.includes(logId) ? prev.filter((id) => id !== logId) : [...prev, logId]))
  }

  const toggleSelectAllVisible = () => {
    const visibleIds = filteredLogs.map((log) => log.id)
    const everyVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIdSet.has(id))

    if (everyVisibleSelected) {
      setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)))
      return
    }

    setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])))
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      <div className='mb-4 flex flex-wrap items-center justify-between gap-4'>
        <div>
          <h2 className='text-2xl font-semibold'>Logs</h2>
          <p className='text-sm text-muted-foreground'>Interactive log exploration with rich metadata.</p>
        </div>
        <div className='flex flex-wrap items-center gap-3'>
          <Button
            variant='secondary'
            onClick={() => analyzeSelectionMutation.mutate()}
            disabled={selectedIds.length === 0 || analyzeSelectionMutation.isPending}
          >
            {analyzeSelectionMutation.isPending
              ? 'Analyzing selected logs...'
              : `Analyze selected logs (${selectedIds.length})`}
          </Button>
          {selectedIds.length > 0 ? (
            <Button variant='outline' onClick={() => setSelectedIds([])}>
              Clear selection
            </Button>
          ) : null}
          <Select value={levelFilter} onValueChange={setLevelFilter}>
            <SelectTrigger className='w-[160px] bg-muted/40'>
              <SelectValue placeholder='Level' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>All levels</SelectItem>
              <SelectItem value='ERROR'>Error</SelectItem>
              <SelectItem value='WARN'>Warn</SelectItem>
              <SelectItem value='INFO'>Info</SelectItem>
              <SelectItem value='DEBUG'>Debug</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {logsQuery.isLoading ? (
        <Skeleton className='h-[520px]' />
      ) : filteredLogs.length === 0 ? (
        <EmptyState title='No logs yet' description='Logs will appear as soon as services emit output.' />
      ) : (
        <>
          <LogTable
            logs={filteredLogs}
            onSelect={setSelected}
            selectedIds={selectedIdSet}
            onToggleSelection={toggleSelection}
            onToggleSelectAllVisible={toggleSelectAllVisible}
            hasMore={Boolean(logsQuery.hasNextPage)}
            isFetchingMore={logsQuery.isFetchingNextPage}
            onLoadMore={() => {
              if (!logsQuery.hasNextPage || logsQuery.isFetchingNextPage) return
              logsQuery.fetchNextPage()
            }}
          />
          <div className='mt-3 text-xs text-muted-foreground'>
            Loaded {pagedLogs.length} historical logs
            {streamedLogs.length > 0 ? ` + ${streamedLogs.length} live logs` : ''}
            {logsQuery.hasNextPage ? '. Scroll to load more.' : '. End of results.'}
          </div>
        </>
      )}

      <Drawer open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle className='flex items-center gap-2'>
              <Code className='h-4 w-4 text-primary' /> Log Detail
            </DrawerTitle>
            <DrawerDescription>Full structured payload for selected log entry.</DrawerDescription>
          </DrawerHeader>
          {selected && (
            <div className='rounded-lg border border-border/60 bg-muted/40 p-3'>
              <CodeMirror
                value={JSON.stringify(
                  {
                    ...(localizePayloadTimestamps(selected) as LogEntry),
                    timestamp: formatDateTime(selected.timestamp),
                  },
                  null,
                  2,
                )}
                height='420px'
                extensions={[jsonLang(), highlightSelectionMatches(), keymap.of(searchKeymap)]}
                theme={oneDark}
                editable={false}
                onCreateEditor={(view) => setEditorView(view)}
              />
            </div>
          )}
        </DrawerContent>
      </Drawer>

      <Drawer open={analysisOpen} onOpenChange={setAnalysisOpen}>
        <DrawerContent className='overflow-y-auto'>
          <DrawerHeader>
            <DrawerTitle>Selected Log Analysis</DrawerTitle>
            <DrawerDescription>
              Groq explanation for the currently selected logs, with the supporting evidence shown below.
            </DrawerDescription>
          </DrawerHeader>
          {analyzeSelectionMutation.data ? (
            <AiAnalysisCard
              summary={analyzeSelectionMutation.data.summary}
              rootCause={analyzeSelectionMutation.data.likely_root_cause}
              confidence={analyzeSelectionMutation.data.confidence}
              actions={analyzeSelectionMutation.data.recommended_actions}
              relatedSignals={analyzeSelectionMutation.data.related_signals}
              evidenceLogs={selectedLogs}
              onAction={() => analyzeSelectionMutation.mutate()}
              actionLabel='Re-run selected-log analysis'
              actionPending={analyzeSelectionMutation.isPending}
            />
          ) : (
            <p className='text-sm text-muted-foreground'>Select logs and run analysis to see Groq output.</p>
          )}
        </DrawerContent>
      </Drawer>
    </motion.div>
  )
}
