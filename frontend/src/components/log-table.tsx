import { useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Badge } from './ui/badge'
import { cn } from '../lib/utils'
import type { LogEntry } from '../lib/api'
import type { BadgeProps } from './ui/badge'
import { formatShortTime } from '../lib/time'

const levelColor: Record<string, NonNullable<BadgeProps['variant']>> = {
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

export function LogTable({
  logs,
  onSelect,
  selectedIds,
  onToggleSelection,
  onToggleSelectAllVisible,
  hasMore,
  isFetchingMore,
  onLoadMore,
}: {
  logs: LogEntry[]
  onSelect: (log: LogEntry) => void
  selectedIds: ReadonlySet<number>
  onToggleSelection: (logId: number) => void
  onToggleSelectAllVisible: () => void
  hasMore: boolean
  isFetchingMore: boolean
  onLoadMore: () => void
}) {
  const parentRef = useRef<HTMLDivElement>(null)
  const rowVirtualizer = useVirtualizer({
    count: logs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56,
    overscan: 10
  })
  const allVisibleSelected = logs.length > 0 && logs.every((log) => selectedIds.has(log.id))

  const handleScroll = () => {
    const parent = parentRef.current
    if (!parent || !hasMore || isFetchingMore) return
    const nearBottom = parent.scrollTop + parent.clientHeight >= parent.scrollHeight - 200
    if (nearBottom) onLoadMore()
  }

  return (
    <div ref={parentRef} onScroll={handleScroll} className='h-[520px] overflow-auto rounded-lg border border-border/60'>
      <div className='grid grid-cols-[44px_120px_160px_1fr_120px] gap-4 border-b border-border/60 bg-muted/40 px-4 py-3 text-xs font-semibold uppercase text-muted-foreground'>
        <div className='flex items-center'>
          <input
            type='checkbox'
            aria-label='Select all visible logs'
            checked={allVisibleSelected}
            onChange={onToggleSelectAllVisible}
          />
        </div>
        <div>Level</div>
        <div>Service</div>
        <div>Message</div>
        <div>Time</div>
      </div>
      <div
        style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}
        className='relative'
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const log = logs[virtualRow.index]
          return (
            <div
              key={log.id}
              data-index={virtualRow.index}
              ref={rowVirtualizer.measureElement}
              onClick={() => onSelect(log)}
              className={cn(
                'grid cursor-pointer grid-cols-[44px_120px_160px_1fr_120px] gap-4 border-b border-border/30 px-4 py-4 text-sm hover:bg-muted/30',
                log.level === 'ERROR' && 'bg-destructive/5'
              )}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`
              }}
            >
              <div className='flex items-center'>
                <input
                  type='checkbox'
                  aria-label={`Select log ${log.id}`}
                  checked={selectedIds.has(log.id)}
                  onClick={(event) => event.stopPropagation()}
                  onChange={() => onToggleSelection(log.id)}
                />
              </div>
              <div>
                <Badge variant={levelColor[log.level] || 'default'}>{log.level}</Badge>
              </div>
              <div className='text-xs text-muted-foreground'>{log.service}</div>
              <div className='truncate'>{cleanMessageForDisplay(log.message)}</div>
              <div className='text-xs text-muted-foreground'>
                {formatShortTime(log.timestamp)}
              </div>
            </div>
          )
        })}
      </div>
      {isFetchingMore ? (
        <div className='border-t border-border/30 px-4 py-2 text-xs text-muted-foreground'>Loading more logs...</div>
      ) : null}
    </div>
  )
}
