import { motion } from 'framer-motion'
import { Bot, Boxes, Database, Eye, GitBranch, Layers3, ShieldAlert, Workflow } from 'lucide-react'

import { Badge } from '../components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'

const stack = ['FastAPI', 'SQLite', 'Qdrant', 'Groq', 'React', 'Vite', 'Docker Compose']

export function AboutPage() {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      <div className='mb-6 flex flex-wrap items-start justify-between gap-4'>
        <div>
          <h2 className='text-2xl font-semibold'>About LOGNEXA</h2>
          <p className='text-sm text-muted-foreground'>Local-first Docker observability with incident detection, vector retrieval, and AI explanation.</p>
        </div>
        <div className='flex flex-wrap gap-2'>
          {stack.map((item) => (
            <Badge key={item} variant='outline'>{item}</Badge>
          ))}
        </div>
      </div>

      <div className='grid gap-6 xl:grid-cols-[1.1fr_0.9fr]'>
        <Card className='glass-panel'>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Eye className='h-4 w-4 text-primary' /> Product Purpose
            </CardTitle>
            <CardDescription>Why this project exists.</CardDescription>
          </CardHeader>
          <CardContent className='space-y-4 text-sm text-muted-foreground'>
            <p>
              LOGNEXA exists to reduce the gap between raw container logs and operational understanding. Instead of reading noisy streams manually,
              the platform collects logs, groups related failures into incidents, retrieves context from a vector database, and asks an LLM to explain
              the likely issue in plain English.
            </p>
            <p>
              It is designed for local Docker stacks, demos, prototypes, and learning environments where you want observability, incident correlation,
              and AI assistance without setting up a large cloud monitoring platform.
            </p>
          </CardContent>
        </Card>

        <Card className='glass-panel'>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Workflow className='h-4 w-4 text-primary' /> End-to-end Flow
            </CardTitle>
            <CardDescription>How data moves through the system.</CardDescription>
          </CardHeader>
          <CardContent className='space-y-3 text-sm'>
            <div className='rounded-xl border border-border/60 bg-muted/30 p-4'>Docker services emit logs.</div>
            <div className='rounded-xl border border-border/60 bg-muted/30 p-4'>Backend collects and normalizes them into structured records.</div>
            <div className='rounded-xl border border-border/60 bg-muted/30 p-4'>SQLite stores logs and incidents as the source of truth.</div>
            <div className='rounded-xl border border-border/60 bg-muted/30 p-4'>Qdrant stores semantic embeddings for retrieval.</div>
            <div className='rounded-xl border border-border/60 bg-muted/30 p-4'>Groq receives evidence plus related context and returns structured reasoning.</div>
            <div className='rounded-xl border border-border/60 bg-muted/30 p-4'>Frontend renders logs, incidents, evidence, and AI output.</div>
          </CardContent>
        </Card>
      </div>

      <div className='mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-4'>
        <Card className='glass-panel'>
          <CardHeader>
            <CardTitle className='flex items-center gap-2 text-base'>
              <ShieldAlert className='h-4 w-4 text-primary' /> Incident Engine
            </CardTitle>
          </CardHeader>
          <CardContent className='text-sm text-muted-foreground'>
            Rule-based detection groups repeated errors, timeouts, database failures, and restart-like patterns into active incidents.
          </CardContent>
        </Card>

        <Card className='glass-panel'>
          <CardHeader>
            <CardTitle className='flex items-center gap-2 text-base'>
              <Database className='h-4 w-4 text-accent' /> Vector Retrieval
            </CardTitle>
          </CardHeader>
          <CardContent className='text-sm text-muted-foreground'>
            Qdrant stores log embeddings so the AI can retrieve semantically related evidence instead of relying only on the immediate incident logs.
          </CardContent>
        </Card>

        <Card className='glass-panel'>
          <CardHeader>
            <CardTitle className='flex items-center gap-2 text-base'>
              <Bot className='h-4 w-4 text-primary' /> AI Explanation
            </CardTitle>
          </CardHeader>
          <CardContent className='text-sm text-muted-foreground'>
            Groq returns summary, root cause, confidence, related signals, and recommended actions for incidents and selected log groups.
          </CardContent>
        </Card>

        <Card className='glass-panel'>
          <CardHeader>
            <CardTitle className='flex items-center gap-2 text-base'>
              <Boxes className='h-4 w-4 text-secondary' /> Local Stack
            </CardTitle>
          </CardHeader>
          <CardContent className='text-sm text-muted-foreground'>
            `service-a` and `service-b` exist as monitored demo services so the observability pipeline has realistic behavior to inspect.
          </CardContent>
        </Card>
      </div>

      <div className='mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]'>
        <Card className='glass-panel'>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Layers3 className='h-4 w-4 text-primary' /> Storage Model
            </CardTitle>
            <CardDescription>What is stored where.</CardDescription>
          </CardHeader>
          <CardContent className='space-y-3 text-sm text-muted-foreground'>
            <div className='rounded-lg border border-border/60 bg-muted/30 p-4'>
              <p className='font-medium text-foreground'>SQLite</p>
              <p>Stores exact logs, incidents, AI fields, timestamps, severity, status, evidence ids, and related structured runtime data.</p>
            </div>
            <div className='rounded-lg border border-border/60 bg-muted/30 p-4'>
              <p className='font-medium text-foreground'>Qdrant</p>
              <p>Stores semantic log embeddings and retrieval metadata used to supply relevant historical context to the AI layer.</p>
            </div>
            <div className='rounded-lg border border-border/60 bg-muted/30 p-4'>
              <p className='font-medium text-foreground'>Frontend state</p>
              <p>Stores temporary UI concerns such as filters, theme, search, streaming toggle, and selected logs during the session.</p>
            </div>
          </CardContent>
        </Card>

        <Card className='glass-panel'>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <GitBranch className='h-4 w-4 text-primary' /> Service Relationships
            </CardTitle>
            <CardDescription>How the runtime pieces depend on each other.</CardDescription>
          </CardHeader>
          <CardContent className='space-y-3 text-sm text-muted-foreground'>
            <p>
              The backend is the central observer. It reads logs from Docker, stores them, detects incidents, indexes vectors, and calls Groq.
              The frontend depends entirely on backend APIs and never performs incident reasoning on its own.
            </p>
            <p>
              `service-a` behaves like a demo web service, while `service-b` behaves like a background worker. They do not directly call the frontend
              or Qdrant. Their role is to generate realistic operational events that the backend can observe and analyze.
            </p>
            <p>
              Qdrant is infrastructure, not a monitored business service. Its role is to supply semantic retrieval so the LLM can reason with more
              than just the latest visible logs.
            </p>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  )
}
