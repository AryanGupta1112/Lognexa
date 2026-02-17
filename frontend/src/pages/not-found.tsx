import { Link } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { Card, CardContent } from '../components/ui/card'
import { Button } from '../components/ui/button'

export function NotFoundPage() {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card className='glass-panel'>
        <CardContent className='space-y-3 p-8'>
          <h2 className='text-2xl font-semibold'>Page not found</h2>
          <p className='text-sm text-muted-foreground'>The route you requested does not exist.</p>
          <Button asChild>
            <Link to='/'>Back to dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  )
}
