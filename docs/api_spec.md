# LOGNEXA API Spec

Base URL: `http://localhost:8000`

## Health

- `GET /api/health`

Response:
```json
{
  "status": "ok",
  "time": "2026-02-09T12:34:56Z",
  "llm": {
    "provider": "groq",
    "configured": true,
    "model": "llama-3.3-70b-versatile"
  },
  "vectordb": {
    "enabled": true,
    "provider": "qdrant",
    "url": "http://localhost:6333",
    "collection": "lognexa_logs",
    "model": "BAAI/bge-small-en-v1.5",
    "ready": true
  }
}
```

## Containers

- `GET /api/containers`

Response:
```json
[
  {
    "id": "abc123",
    "name": "lognexa-service-a",
    "service": "service-a",
    "image": "lognexa-service-a:latest",
    "status": "running"
  }
]
```

## Logs

- `GET /api/logs?service=&level=&q=&start=&end=&limit=&offset=`

Parameters:
- `service`: optional service name
- `level`: INFO/WARN/ERROR/DEBUG
- `q`: full-text search in message
- `start`, `end`: ISO timestamps
- `limit`, `offset`: pagination

## Incidents

- `GET /api/incidents?status=&severity=&service=&start=&end=`
- `GET /api/incidents/{id}`
- `POST /api/incidents/{id}/analyze`

### Analyze response
```json
{
  "id": 12,
  "ai_summary": "...",
  "ai_root_cause": "...",
  "ai_confidence": 0.78,
  "ai_actions": ["..."],
  "ai_related_signals": ["..."]
}
```

The analyze route uses Groq plus RAG when Qdrant is available. It embeds stored logs, retrieves semantically related historical context, and injects that context into the prompt before generating the final structured explanation.

## Stream

- `GET /api/stream/logs`

Server-Sent Events stream of JSON log entries.
