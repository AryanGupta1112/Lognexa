import { useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Badge } from './ui/badge'
import { cn } from '../lib/utils'
import type { LogEntry } from '../lib/api'

const levelColor: Record<string, string> = {
  ERROR: 'destructive',
  WARN: 'secondary',
  INFO: 'default',
  DEBUG: 'outline'
}

export function LogTable({ logs, onSelect }: { logs: LogEntry[]; onSelect: (log: LogEntry) => void }) {
  const parentRef = useRef<HTMLDivElement>(null)
  const rowVirtualizer = useVirtualizer({
    count: logs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56,
    overscan: 10
  })

  return (
    <div ref={parentRef} className='h-[520px] overflow-auto rounded-lg border border-border/60'>
      <div className='grid grid-cols-[120px_160px_1fr_120px] gap-4 border-b border-border/60 bg-muted/40 px-4 py-3 text-xs font-semibold uppercase text-muted-foreground'>
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
                'grid cursor-pointer grid-cols-[120px_160px_1fr_120px] gap-4 border-b border-border/30 px-4 py-4 text-sm hover:bg-muted/30',
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
              <div>
                <Badge variant={levelColor[log.level] || 'default'}>{log.level}</Badge>
              </div>
              <div className='text-xs text-muted-foreground'>{log.service}</div>
              <div className='truncate'>{log.message}</div>
              <div className='text-xs text-muted-foreground'>
                {new Date(log.timestamp).toLocaleTimeString()}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
