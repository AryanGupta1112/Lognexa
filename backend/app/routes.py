from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, Query, HTTPException, Request
from sqlalchemy import or_
from sqlmodel import Session, select

from .db import get_session
from .models import LogEntry, Incident
from .schemas import (
    LogEntryRead,
    IncidentRead,
    IncidentAnalyzeResponse,
    ContainerInfo,
    LogSelectionAnalyzeRequest,
    LogSelectionAnalyzeResponse,
)
from .ai_analyzer import (
    analyze_incident,
    analyze_log_selection,
    build_log_selection_query,
    build_retrieval_query,
)
from .config import settings


router = APIRouter(prefix="/api")


def _parse_dt(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value)
    except Exception:
        return None


@router.get("/health")
def health(request: Request):
    vector_store = getattr(request.app.state, "vector_store", None)
    return {
        "status": "ok",
        "time": datetime.utcnow().isoformat(),
        "llm": {
            "provider": "groq",
            "configured": bool(settings.groq_api_key),
            "model": settings.groq_model,
        },
        "vectordb": {
            "enabled": settings.vector_enabled,
            "provider": "qdrant",
            "url": settings.qdrant_url,
            "collection": settings.vector_collection,
            "model": settings.vector_model,
            "ready": bool(vector_store and vector_store.is_available()),
        },
    }


@router.get("/containers", response_model=List[ContainerInfo])
def containers(request: Request):
    collector = request.app.state.collector
    return collector.list_containers()


@router.get("/logs", response_model=List[LogEntryRead])
def logs(
    service: Optional[str] = None,
    level: Optional[str] = None,
    q: Optional[str] = None,
    start: Optional[str] = None,
    end: Optional[str] = None,
    limit: int = Query(200, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    session: Session = Depends(get_session),
):
    stmt = select(LogEntry)
    if service:
        stmt = stmt.where(LogEntry.service == service)
    if level:
        stmt = stmt.where(LogEntry.level == level)
    if q:
        pattern = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(
                LogEntry.message.ilike(pattern),
                LogEntry.raw.ilike(pattern),
                LogEntry.service.ilike(pattern),
                LogEntry.level.ilike(pattern),
                LogEntry.container_id.ilike(pattern),
            )
        )
    start_dt = _parse_dt(start)
    end_dt = _parse_dt(end)
    if start_dt:
        stmt = stmt.where(LogEntry.timestamp >= start_dt)
    if end_dt:
        stmt = stmt.where(LogEntry.timestamp <= end_dt)

    stmt = stmt.order_by(LogEntry.timestamp.desc()).offset(offset).limit(limit)
    return session.exec(stmt).all()


@router.post("/logs/analyze", response_model=LogSelectionAnalyzeResponse)
async def analyze_logs(
    payload: LogSelectionAnalyzeRequest,
    request: Request,
    session: Session = Depends(get_session),
):
    log_ids = [log_id for log_id in payload.log_ids if isinstance(log_id, int)]
    if not log_ids:
        raise HTTPException(status_code=400, detail="At least one log id is required")
    if len(log_ids) > 50:
        raise HTTPException(status_code=400, detail="Select at most 50 logs per analysis")

    logs = session.exec(select(LogEntry).where(LogEntry.id.in_(log_ids))).all()
    if not logs:
        raise HTTPException(status_code=404, detail="Selected logs not found")

    logs = sorted(logs, key=lambda log: log.timestamp)
    vector_store = getattr(request.app.state, "vector_store", None)
    rag_matches = []
    if vector_store:
        rag_matches = vector_store.search_related_logs(
            query_text=build_log_selection_query(logs),
            services={log.service for log in logs},
            exclude_ids={log.id for log in logs if log.id is not None},
            limit=settings.rag_context_limit,
        )

    result = await analyze_log_selection(logs, rag_matches=rag_matches)
    return LogSelectionAnalyzeResponse(
        summary=result.get("summary"),
        likely_root_cause=result.get("likely_root_cause"),
        confidence=result.get("confidence"),
        recommended_actions=result.get("recommended_actions", []),
        related_signals=result.get("related_signals", []),
    )


@router.get("/incidents", response_model=List[IncidentRead])
def incidents(
    status: Optional[str] = None,
    severity: Optional[str] = None,
    service: Optional[str] = None,
    q: Optional[str] = None,
    start: Optional[str] = None,
    end: Optional[str] = None,
    limit: int = Query(200, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    session: Session = Depends(get_session),
):
    stmt = select(Incident)
    if status:
        stmt = stmt.where(Incident.status == status)
    if severity:
        stmt = stmt.where(Incident.severity == severity)
    if q:
        pattern = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(
                Incident.title.ilike(pattern),
                Incident.signature.ilike(pattern),
                Incident.severity.ilike(pattern),
                Incident.status.ilike(pattern),
            )
        )
    start_dt = _parse_dt(start)
    end_dt = _parse_dt(end)
    if start_dt:
        stmt = stmt.where(Incident.updated_at >= start_dt)
    if end_dt:
        stmt = stmt.where(Incident.updated_at <= end_dt)

    stmt = stmt.order_by(Incident.updated_at.desc())
    results = session.exec(stmt).all()
    if service:
        results = [incident for incident in results if service in incident.services]
    if q:
        term = q.strip().lower()
        results = [
            incident
            for incident in results
            if any(
                term in (field or '').lower()
                for field in [
                    incident.title,
                    incident.signature,
                    incident.severity,
                    incident.status,
                    ' '.join(incident.services or []),
                ]
            )
        ]
    return results[offset : offset + limit]


@router.get("/incidents/{incident_id}", response_model=IncidentRead)
def incident_detail(incident_id: int, session: Session = Depends(get_session)):
    incident = session.get(Incident, incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident


@router.post("/incidents/{incident_id}/analyze", response_model=IncidentAnalyzeResponse)
async def analyze(incident_id: int, request: Request, session: Session = Depends(get_session)):
    incident = session.get(Incident, incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    logs: List[LogEntry] = []
    if incident.evidence_log_ids:
        logs = session.exec(select(LogEntry).where(LogEntry.id.in_(incident.evidence_log_ids))).all()

    vector_store = getattr(request.app.state, "vector_store", None)
    rag_matches = []
    if vector_store:
        rag_matches = vector_store.search_related_logs(
            query_text=build_retrieval_query(incident, logs),
            services=incident.services,
            exclude_ids=set(incident.evidence_log_ids or []),
            limit=settings.rag_context_limit,
        )

    result = await analyze_incident(incident, logs, rag_matches=rag_matches)
    incident.ai_summary = result.get("summary")
    incident.ai_root_cause = result.get("likely_root_cause")
    incident.ai_confidence = result.get("confidence")
    incident.ai_actions = result.get("recommended_actions", [])
    incident.ai_related_signals = result.get("related_signals", [])
    session.add(incident)
    session.commit()
    session.refresh(incident)

    return IncidentAnalyzeResponse(
        id=incident.id,
        ai_summary=incident.ai_summary,
        ai_root_cause=incident.ai_root_cause,
        ai_confidence=incident.ai_confidence,
        ai_actions=incident.ai_actions,
        ai_related_signals=incident.ai_related_signals,
        status=incident.status,
    )
