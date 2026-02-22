import { motion } from 'framer-motion'
import { Card, CardContent } from '../components/ui/card'

export function AboutPage() {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      <div className='mb-4'>
        <h2 className='text-2xl font-semibold'>About LOGNEXA</h2>
        <p className='text-sm text-muted-foreground'>AI-assisted log analysis and incident explanation for Dockerized services.</p>
      </div>
      <Card className='glass-panel'>
        <CardContent className='space-y-3 p-6 text-sm'>
          <p>
            LOGNEXA streams container logs, normalizes them into a unified schema, and highlights incident patterns using
            deterministic rules. When an LLM is configured, it produces actionable explanations and remediation guidance.
          </p>
          <p>
            Built for local-first observability stacks with Docker Compose, the system demonstrates how AI can augment
            incident response without locking you into paid services.
          </p>
        </CardContent>
      </Card>
    </motion.div>
  )
}
