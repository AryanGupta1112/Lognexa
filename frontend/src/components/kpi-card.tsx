import { ReactNode } from 'react'
import { Card, CardContent } from './ui/card'

export function KpiCard({ title, value, icon, trend }: { title: string; value: string; icon: ReactNode; trend?: string }) {
  return (
    <Card className='glass-panel'>
      <CardContent className='flex items-center justify-between p-5'>
        <div>
          <p className='text-xs uppercase tracking-wide text-muted-foreground'>{title}</p>
          <p className='text-2xl font-semibold mt-2'>{value}</p>
          {trend && <p className='text-xs text-muted-foreground mt-1'>{trend}</p>}
        </div>
        <div className='rounded-xl bg-muted/50 p-3 text-primary'>{icon}</div>
      </CardContent>
    </Card>
  )
}
