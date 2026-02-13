# LOGNEXA API Spec

Base URL: `http://localhost:8000`

## Health

- `GET /api/health`

Response:
```json
{
  "status": "ok",
  "time": "2026-02-09T12:34:56Z",
  "llm": { "ollama": true, "huggingface": false }
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

## Stream

- `GET /api/stream/logs`

Server-Sent Events stream of JSON log entries.
