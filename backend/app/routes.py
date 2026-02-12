from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, Query, HTTPException, Request
from sqlmodel import Session, select

from .db import get_session
from .models import LogEntry, Incident
from .schemas import LogEntryRead, IncidentRead, IncidentAnalyzeResponse, ContainerInfo
from .ai_analyzer import analyze_incident
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
def health():
    return {
        "status": "ok",
        "time": datetime.utcnow().isoformat(),
        "llm": {
            "ollama": bool(settings.ollama_base_url),
            "huggingface": bool(settings.hf_token),
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
        stmt = stmt.where(LogEntry.message.contains(q))
    start_dt = _parse_dt(start)
    end_dt = _parse_dt(end)
    if start_dt:
        stmt = stmt.where(LogEntry.timestamp >= start_dt)
    if end_dt:
        stmt = stmt.where(LogEntry.timestamp <= end_dt)

    stmt = stmt.order_by(LogEntry.timestamp.desc()).offset(offset).limit(limit)
    return session.exec(stmt).all()


@router.get("/incidents", response_model=List[IncidentRead])
def incidents(
    status: Optional[str] = None,
    severity: Optional[str] = None,
    service: Optional[str] = None,
    start: Optional[str] = None,
    end: Optional[str] = None,
    session: Session = Depends(get_session),
):
    stmt = select(Incident)
    if status:
        stmt = stmt.where(Incident.status == status)
    if severity:
        stmt = stmt.where(Incident.severity == severity)
    start_dt = _parse_dt(start)
    end_dt = _parse_dt(end)
    if start_dt:
        stmt = stmt.where(Incident.created_at >= start_dt)
    if end_dt:
        stmt = stmt.where(Incident.created_at <= end_dt)

    stmt = stmt.order_by(Incident.created_at.desc())
    results = session.exec(stmt).all()
    if service:
        results = [incident for incident in results if service in incident.services]
    return results


@router.get("/incidents/{incident_id}", response_model=IncidentRead)
def incident_detail(incident_id: int, session: Session = Depends(get_session)):
    incident = session.get(Incident, incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident


@router.post("/incidents/{incident_id}/analyze", response_model=IncidentAnalyzeResponse)
async def analyze(incident_id: int, session: Session = Depends(get_session)):
    incident = session.get(Incident, incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    logs: List[LogEntry] = []
    if incident.evidence_log_ids:
        logs = session.exec(select(LogEntry).where(LogEntry.id.in_(incident.evidence_log_ids))).all()

    result = await analyze_incident(incident, logs)
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
