# LOGNEXA Architecture

LOGNEXA is a local-first, Docker Compose observability stack for AI-assisted log analysis. It includes:

- **Backend (FastAPI)**
  - Streams Docker container logs via the Docker SDK and normalizes entries.
  - Persists logs and incidents in SQLite using SQLModel.
  - Indexes logs into Qdrant using FastEmbed for semantic retrieval.
  - Runs background detection for incident patterns.
  - AI analysis uses Groq, augmented with RAG context from Qdrant.
  - SSE endpoint for real-time log streaming.

- **Frontend (React + Vite)**
  - TanStack Router for nested routes.
  - TanStack Query for API caching and retry.
  - Zustand for UI state.
  - Recharts for visualization.
  - shadcn/ui + Radix UI for accessible components.

- **Sample Services**
  - `service-a`: HTTP API with randomized failures and manual failure trigger.
  - `service-b`: background worker emitting periodic task logs and simulated DB errors.

## Data Flow

1. The backend connects to `/var/run/docker.sock` and streams container logs.
2. Logs are normalized into a common schema and persisted to SQLite.
3. The backend embeds log content and indexes it in Qdrant for semantic lookup.
4. Rule-based detection scans recent logs and creates/updates incidents.
5. Groq-based AI analysis enriches incidents with summaries and recommended actions using both direct evidence and retrieved historical context.
6. The frontend queries logs/incidents and subscribes to SSE for real-time updates.

## Resilience

- If the Docker socket is unavailable, LOGNEXA enters fallback mode with synthetic logs.
- If Groq is not configured, the app still runs with rule-based incidents.
- If Qdrant is unavailable, the app still runs, but AI analysis falls back to direct evidence without RAG enrichment.
