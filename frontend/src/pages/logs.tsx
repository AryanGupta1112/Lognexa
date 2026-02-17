import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Code } from 'lucide-react'
import { toast } from 'sonner'
import CodeMirror from '@uiw/react-codemirror'
import { json as jsonLang } from '@codemirror/lang-json'
import { oneDark } from '@codemirror/theme-one-dark'
import { highlightSelectionMatches, SearchQuery, setSearchQuery, searchKeymap } from '@codemirror/search'
import { keymap } from '@codemirror/view'

import { getLogs, createLogStream, type LogEntry } from '../lib/api'
import { useUiStore } from '../lib/store'
import { rangeToStart } from '../lib/time'
import { LogTable } from '../components/log-table'
import { Skeleton } from '../components/ui/skeleton'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '../components/ui/drawer'
import { EmptyState } from '../components/empty-state'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'

export function LogsPage() {
  const selectedService = useUiStore((s) => s.selectedService)
  const timeRange = useUiStore((s) => s.timeRange)
  const search = useUiStore((s) => s.search)
  const streaming = useUiStore((s) => s.streaming)
  const start = rangeToStart(timeRange)
  const [levelFilter, setLevelFilter] = useState('all')

  const logsQuery = useQuery({
    queryKey: ['logs', selectedService, timeRange, levelFilter],
    queryFn: () =>
      getLogs({
        service: selectedService !== 'all' ? selectedService : undefined,
        level: levelFilter !== 'all' ? levelFilter : undefined,
        start,
        limit: 500
      })
  })

  const [logs, setLogs] = useState<LogEntry[]>([])
  const [selected, setSelected] = useState<LogEntry | null>(null)
  const [editorView, setEditorView] = useState<any>(null)

  useEffect(() => {
    if (logsQuery.isError) toast.error('Failed to load logs')
  }, [logsQuery.isError])

  useEffect(() => {
    if (logsQuery.data) {
      setLogs(logsQuery.data)
    }
  }, [logsQuery.data])

  useEffect(() => {
    if (!streaming) return
    const stop = createLogStream((log) => {
      setLogs((prev) => [log, ...prev].slice(0, 500))
    })
    return stop
  }, [streaming])

  useEffect(() => {
    if (!editorView) return
    if (!search) return
    const query = new SearchQuery({ search, caseSensitive: false })
    editorView.dispatch({ effects: setSearchQuery.of(query) })
  }, [editorView, search])

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (selectedService !== 'all' && log.service !== selectedService) return false
      if (levelFilter !== 'all' && log.level !== levelFilter) return false
      if (search && !log.message.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [logs, search, selectedService, levelFilter])

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      <div className='flex flex-wrap items-center justify-between gap-4 mb-4'>
        <div>
          <h2 className='text-2xl font-semibold'>Logs</h2>
          <p className='text-sm text-muted-foreground'>Interactive log exploration with rich metadata.</p>
        </div>
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

      {logsQuery.isLoading ? (
        <Skeleton className='h-[520px]' />
      ) : filteredLogs.length === 0 ? (
        <EmptyState title='No logs yet' description='Logs will appear as soon as services emit output.' />
      ) : (
        <LogTable logs={filteredLogs} onSelect={setSelected} />
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
                value={JSON.stringify(selected, null, 2)}
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
    </motion.div>
  )
}
