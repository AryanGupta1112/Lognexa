import { motion } from 'framer-motion'
import { Card, CardContent } from '../components/ui/card'

type RouteErrorProps = {
  error: unknown
  reset?: () => void
}

export function RouteErrorPage({ error }: RouteErrorProps) {
  const message = error instanceof Error ? error.message : 'Unexpected route error'

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card className='glass-panel'>
        <CardContent className='space-y-2 p-8'>
          <h2 className='text-2xl font-semibold'>Something went wrong</h2>
          <p className='text-sm text-muted-foreground'>{message}</p>
        </CardContent>
      </Card>
    </motion.div>
  )
}
