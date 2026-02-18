import { ReactNode } from 'react'
import { Card, CardContent } from './ui/card'

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <Card className='glass-panel'>
      <CardContent className='py-12 text-center space-y-2'>
        <p className='text-lg font-semibold'>{title}</p>
        <p className='text-sm text-muted-foreground'>{description}</p>
        {action}
      </CardContent>
    </Card>
  )
}
