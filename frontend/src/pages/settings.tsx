import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Activity,
  Boxes,
  BrainCircuit,
  Database,
  Radio,
  Server,
  ShieldCheck,
  Sparkles,
  Workflow,
} from 'lucide-react'

import { getContainers, getHealth } from '../lib/api'
import { useUiStore } from '../lib/store'
import { Badge } from '../components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Switch } from '../components/ui/switch'

function statusVariant(active: boolean) {
  return active ? 'default' : 'outline'
}

export function SettingsPage() {
  const healthQuery = useQuery({ queryKey: ['health'], queryFn: getHealth, refetchInterval: 5000 })
  const containersQuery = useQuery({ queryKey: ['containers'], queryFn: getContainers, refetchInterval: 5000 })
  const streaming = useUiStore((s) => s.streaming)
  const setStreaming = useUiStore((s) => s.setStreaming)
  const theme = useUiStore((s) => s.theme)

  const containers = containersQuery.data || []
  const health = healthQuery.data

  const serviceSummary = useMemo(() => {
    const appServices = containers.filter((container) => ['service-a', 'service-b'].includes(container.service))
    return {
      total: containers.length,
      monitored: appServices.length,
      running: containers.filter((container) => container.status === 'running').length,
    }
  }, [containers])

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      <div className='mb-6 flex flex-wrap items-start justify-between gap-4'>
        <div>
          <h2 className='text-2xl font-semibold'>Settings</h2>
          <p className='text-sm text-muted-foreground'>System health, runtime preferences, and the current AI plus vector retrieval wiring.</p>
        </div>
        <div className='flex flex-wrap gap-2'>
          <Badge variant={statusVariant(Boolean(health?.llm?.configured))}>Groq {health?.llm?.configured ? 'ready' : 'missing key'}</Badge>
          <Badge variant={statusVariant(Boolean(health?.vectordb?.ready))}>Qdrant {health?.vectordb?.ready ? 'connected' : 'offline'}</Badge>
          <Badge variant={statusVariant(streaming)}>Streaming {streaming ? 'on' : 'off'}</Badge>
        </div>
      </div>

      <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
        <Card className='glass-panel'>
          <CardHeader className='pb-3'>
            <CardDescription>LLM Provider</CardDescription>
            <CardTitle className='flex items-center justify-between'>
              <span>{health?.llm?.provider || 'groq'}</span>
              <BrainCircuit className='h-5 w-5 text-primary' />
            </CardTitle>
          </CardHeader>
          <CardContent className='pt-0 text-sm text-muted-foreground'>
            Model: {health?.llm?.model || 'llama-3.3-70b-versatile'}
          </CardContent>
        </Card>

        <Card className='glass-panel'>
          <CardHeader className='pb-3'>
            <CardDescription>Vector Retrieval</CardDescription>
            <CardTitle className='flex items-center justify-between'>
              <span>{health?.vectordb?.provider || 'qdrant'}</span>
              <Database className='h-5 w-5 text-accent' />
            </CardTitle>
          </CardHeader>
          <CardContent className='pt-0 text-sm text-muted-foreground'>
            Collection: {health?.vectordb?.collection || 'lognexa_logs'}
          </CardContent>
        </Card>

        <Card className='glass-panel'>
          <CardHeader className='pb-3'>
            <CardDescription>Observed Containers</CardDescription>
            <CardTitle className='flex items-center justify-between'>
              <span>{serviceSummary.total}</span>
              <Boxes className='h-5 w-5 text-secondary' />
            </CardTitle>
          </CardHeader>
          <CardContent className='pt-0 text-sm text-muted-foreground'>
            {serviceSummary.running} running, {serviceSummary.monitored} demo services
          </CardContent>
        </Card>

        <Card className='glass-panel'>
          <CardHeader className='pb-3'>
            <CardDescription>Frontend Runtime</CardDescription>
            <CardTitle className='flex items-center justify-between'>
              <span>{theme}</span>
              <Sparkles className='h-5 w-5 text-primary' />
            </CardTitle>
          </CardHeader>
          <CardContent className='pt-0 text-sm text-muted-foreground'>
            Streaming is currently {streaming ? 'enabled' : 'disabled'}
          </CardContent>
        </Card>
      </div>

      <div className='mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]'>
        <Card className='glass-panel'>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Workflow className='h-4 w-4 text-primary' /> Runtime Topology
            </CardTitle>
            <CardDescription>How LOGNEXA is currently wired at runtime.</CardDescription>
          </CardHeader>
          <CardContent className='grid gap-4 md:grid-cols-3'>
            <div className='rounded-xl border border-border/60 bg-muted/30 p-4'>
              <p className='mb-2 text-sm font-medium'>1. Collection</p>
              <p className='text-sm text-muted-foreground'>The backend reads Docker logs, normalizes them, stores them in SQLite, and pushes new entries into live streaming.</p>
            </div>
            <div className='rounded-xl border border-border/60 bg-muted/30 p-4'>
              <p className='mb-2 text-sm font-medium'>2. Retrieval</p>
              <p className='text-sm text-muted-foreground'>Every stored log is embedded into Qdrant so incidents and selected logs can fetch semantically related context.</p>
            </div>
            <div className='rounded-xl border border-border/60 bg-muted/30 p-4'>
              <p className='mb-2 text-sm font-medium'>3. Explanation</p>
              <p className='text-sm text-muted-foreground'>Groq receives direct evidence plus retrieved context and returns structured incident reasoning.</p>
            </div>
          </CardContent>
        </Card>

        <Card className='glass-panel'>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Radio className='h-4 w-4 text-primary' /> Live Controls
            </CardTitle>
            <CardDescription>Frontend controls that affect the live experience.</CardDescription>
          </CardHeader>
          <CardContent className='space-y-5'>
            <div className='flex items-center justify-between rounded-xl border border-border/60 bg-muted/30 p-4'>
              <div>
                <p className='text-sm font-medium'>Live log stream</p>
                <p className='text-xs text-muted-foreground'>Toggle SSE updates for the Logs page.</p>
              </div>
              <Switch checked={streaming} onCheckedChange={setStreaming} />
            </div>
            <div className='rounded-xl border border-border/60 bg-muted/30 p-4 text-sm text-muted-foreground'>
              Incident and dashboard queries auto-refresh in the UI, so active issues remain visible without a manual reload.
            </div>
          </CardContent>
        </Card>
      </div>

      <div className='mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]'>
        <Card className='glass-panel'>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <ShieldCheck className='h-4 w-4 text-primary' /> Configuration Checklist
            </CardTitle>
            <CardDescription>What needs to be present for the full AI plus RAG flow.</CardDescription>
          </CardHeader>
          <CardContent className='space-y-3 text-sm'>
            <div className='flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 px-4 py-3'>
              <span>Groq API key</span>
              <Badge variant={statusVariant(Boolean(health?.llm?.configured))}>{health?.llm?.configured ? 'configured' : 'missing'}</Badge>
            </div>
            <div className='flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 px-4 py-3'>
              <span>Qdrant connection</span>
              <Badge variant={statusVariant(Boolean(health?.vectordb?.ready))}>{health?.vectordb?.ready ? 'connected' : 'unavailable'}</Badge>
            </div>
            <div className='flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 px-4 py-3'>
              <span>Vector collection</span>
              <Badge variant='outline'>{health?.vectordb?.collection || 'lognexa_logs'}</Badge>
            </div>
            <div className='rounded-lg border border-border/60 bg-muted/30 p-4 text-xs text-muted-foreground'>
              The backend reads `GROQ_API_KEY`, `GROQ_MODEL`, `QDRANT_URL`, `VECTOR_COLLECTION`, and `VECTOR_MODEL`. Only the backend needs the Groq key.
            </div>
          </CardContent>
        </Card>

        <Card className='glass-panel'>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Server className='h-4 w-4 text-primary' /> Active Services
            </CardTitle>
            <CardDescription>Containers visible to the backend right now.</CardDescription>
          </CardHeader>
          <CardContent className='space-y-3'>
            {containers.length === 0 ? (
              <p className='text-sm text-muted-foreground'>No containers reported yet.</p>
            ) : (
              containers.map((container) => (
                <div key={container.id} className='flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 px-4 py-3'>
                  <div>
                    <p className='text-sm font-medium'>{container.service}</p>
                    <p className='text-xs text-muted-foreground'>{container.name} - {container.image}</p>
                  </div>
                  <Badge variant={statusVariant(container.status === 'running')}>{container.status}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className='mt-6'>
        <Card className='glass-panel'>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Activity className='h-4 w-4 text-primary' /> Health Snapshot
            </CardTitle>
            <CardDescription>Latest backend-reported readiness state.</CardDescription>
          </CardHeader>
          <CardContent className='grid gap-4 md:grid-cols-2 text-sm text-muted-foreground'>
            <div className='rounded-xl border border-border/60 bg-muted/30 p-4'>
              <p className='mb-1 font-medium text-foreground'>LLM status</p>
              <p>Provider: {health?.llm?.provider || 'groq'}</p>
              <p>Configured: {health?.llm?.configured ? 'yes' : 'no'}</p>
              <p>Model: {health?.llm?.model || 'llama-3.3-70b-versatile'}</p>
            </div>
            <div className='rounded-xl border border-border/60 bg-muted/30 p-4'>
              <p className='mb-1 font-medium text-foreground'>Vector DB status</p>
              <p>Provider: {health?.vectordb?.provider || 'qdrant'}</p>
              <p>Ready: {health?.vectordb?.ready ? 'yes' : 'no'}</p>
              <p>URL: {health?.vectordb?.url || 'http://qdrant:6333'}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  )
}
