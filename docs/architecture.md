# LOGNEXA Architecture

LOGNEXA is a local-first, Docker Compose observability stack for AI-assisted log analysis. It includes:

- **Backend (FastAPI)**
  - Streams Docker container logs via the Docker SDK and normalizes entries.
  - Persists logs and incidents in SQLite using SQLModel.
  - Runs background detection for incident patterns.
  - Optional AI analysis using Ollama or Hugging Face.
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
3. Rule-based detection scans recent logs and creates/updates incidents.
4. Optional AI analysis enriches incidents with summaries and recommended actions.
5. The frontend queries logs/incidents and subscribes to SSE for real-time updates.

## Resilience

- If the Docker socket is unavailable, LOGNEXA enters fallback mode with synthetic logs.
- If LLMs are not configured, the app still runs with rule-based incidents.
