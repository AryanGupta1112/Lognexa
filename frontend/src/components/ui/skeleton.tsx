import { cn } from '../../lib/utils'

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton rounded-md bg-muted', className)} />
}

export { Skeleton }
