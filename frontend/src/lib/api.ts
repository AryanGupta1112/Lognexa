export interface LogEntry {
  id: number
  timestamp: string
  service: string
  container_id: string
  level: string
  message: string
  raw: string
  tags: Record<string, unknown>
}

export interface Incident {
  id: number
  created_at: string
  updated_at: string
  severity: string
  services: string[]
  title: string
  signature: string
  evidence_log_ids: number[]
  status: string
  ai_summary?: string | null
  ai_root_cause?: string | null
  ai_confidence?: number | null
  ai_actions?: string[]
  ai_related_signals?: string[]
}

export interface IncidentAnalyzeResponse {
  id: number
  ai_summary?: string | null
  ai_root_cause?: string | null
  ai_confidence?: number | null
  ai_actions?: string[]
  ai_related_signals?: string[]
  status: string
}

export interface LogSelectionAnalyzeResponse {
  summary?: string | null
  likely_root_cause?: string | null
  confidence?: number | null
  recommended_actions?: string[]
  related_signals?: string[]
}

export interface ContainerInfo {
  id: string
  name: string
  service: string
  image: string
  status: string
}

export interface HealthResponse {
  status: string
  time: string
  llm: {
    provider: string
    configured: boolean
    model: string
  }
  vectordb: {
    enabled: boolean
    provider: string
    url: string
    collection: string
    model: string
    ready: boolean
  }
}

const API_BASE = import.meta.env.VITE_API_URL || '/api'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  })
  if (!res.ok) {
    const message = await res.text()
    throw new Error(message || 'Request failed')
  }
  return res.json()
}

export function getHealth() {
  return request<HealthResponse>('/health')
}

export function getContainers() {
  return request<ContainerInfo[]>('/containers')
}

export interface LogQuery {
  service?: string
  level?: string
  q?: string
  start?: string
  end?: string
  limit?: number
  offset?: number
}

export function getLogs(query: LogQuery) {
  const params = new URLSearchParams()
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      params.set(key, String(value))
    }
  })
  const qs = params.toString()
  return request<LogEntry[]>(`/logs${qs ? `?${qs}` : ''}`)
}

export interface IncidentQuery {
  status?: string
  severity?: string
  service?: string
  q?: string
  start?: string
  end?: string
  limit?: number
  offset?: number
}

export function getIncidents(query: IncidentQuery) {
  const params = new URLSearchParams()
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      params.set(key, String(value))
    }
  })
  const qs = params.toString()
  return request<Incident[]>(`/incidents${qs ? `?${qs}` : ''}`)
}

export async function getAllLogs(query: LogQuery, pageSize = 500, maxPages = 200) {
  const all: LogEntry[] = []
  let offset = 0
  let pageCount = 0

  while (true) {
    const page = await getLogs({ ...query, limit: pageSize, offset })
    all.push(...page)
    pageCount += 1
    if (page.length < pageSize) break
    if (pageCount >= maxPages) break
    offset += pageSize
  }

  return all
}

export async function getAllIncidents(query: IncidentQuery, pageSize = 200, maxPages = 200) {
  const all: Incident[] = []
  let offset = 0
  let pageCount = 0

  while (true) {
    const page = await getIncidents({ ...query, limit: pageSize, offset })
    all.push(...page)
    pageCount += 1
    if (page.length < pageSize) break
    if (pageCount >= maxPages) break
    offset += pageSize
  }

  return all
}

export function getIncident(id: number) {
  return request<Incident>(`/incidents/${id}`)
}

export function analyzeIncident(id: number) {
  return request<IncidentAnalyzeResponse>(`/incidents/${id}/analyze`, { method: 'POST' })
}

export function analyzeSelectedLogs(logIds: number[]) {
  return request<LogSelectionAnalyzeResponse>('/logs/analyze', {
    method: 'POST',
    body: JSON.stringify({ log_ids: logIds })
  })
}

export function createLogStream(onMessage: (log: LogEntry) => void) {
  const url = import.meta.env.VITE_SSE_URL || '/api/stream/logs'
  const source = new EventSource(url)
  source.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      onMessage(data)
    } catch {
      // ignore
    }
  }
  return () => source.close()
}
