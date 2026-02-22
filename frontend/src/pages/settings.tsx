import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Cpu, Cloud, ShieldCheck } from 'lucide-react'

import { getHealth } from '../lib/api'
import { useUiStore } from '../lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Switch } from '../components/ui/switch'

export function SettingsPage() {
  const { data } = useQuery({ queryKey: ['health'], queryFn: getHealth })
  const streaming = useUiStore((s) => s.streaming)
  const setStreaming = useUiStore((s) => s.setStreaming)

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      <div className='mb-4'>
        <h2 className='text-2xl font-semibold'>Settings</h2>
        <p className='text-sm text-muted-foreground'>Configure LLM providers and streaming preferences.</p>
      </div>

      <div className='grid gap-6 lg:grid-cols-2'>
        <Card className='glass-panel'>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Cpu className='h-4 w-4 text-primary' /> Local Ollama
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-3 text-sm'>
            <p>Status: {data?.llm?.ollama ? 'Connected' : 'Not configured'}</p>
            <p className='text-muted-foreground'>Set `OLLAMA_BASE_URL` to enable local inference.</p>
          </CardContent>
        </Card>

        <Card className='glass-panel'>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Cloud className='h-4 w-4 text-secondary' /> Hugging Face
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-3 text-sm'>
            <p>Status: {data?.llm?.huggingface ? 'Connected' : 'Not configured'}</p>
            <p className='text-muted-foreground'>Provide `HF_TOKEN` and `HF_MODEL` to enable cloud inference.</p>
          </CardContent>
        </Card>
      </div>

      <div className='mt-6 grid gap-6 lg:grid-cols-2'>
        <Card className='glass-panel'>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <ShieldCheck className='h-4 w-4 text-primary' /> Provider Preference
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-3 text-sm'>
            <p className='text-muted-foreground'>Default order: Ollama first, then Hugging Face.</p>
            <Select defaultValue='ollama'>
              <SelectTrigger className='w-[200px] bg-muted/40'>
                <SelectValue placeholder='Provider' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='ollama'>Ollama (Local)</SelectItem>
                <SelectItem value='huggingface'>Hugging Face</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card className='glass-panel'>
          <CardHeader>
            <CardTitle>Real-time Streaming</CardTitle>
          </CardHeader>
          <CardContent className='flex items-center justify-between'>
            <div>
              <p className='text-sm font-medium'>Live log stream</p>
              <p className='text-xs text-muted-foreground'>Toggle SSE streaming for new logs.</p>
            </div>
            <Switch checked={streaming} onCheckedChange={setStreaming} />
          </CardContent>
        </Card>
      </div>
    </motion.div>
  )
}
