from datetime import datetime, timezone
from typing import List

from sqlmodel import Session, select

from .models import Incident
from .anomaly_detector import detect_incidents, DetectedIncident


class IncidentManager:
    def __init__(self) -> None:
        self.last_scan_at = None

    def scan(self, session: Session) -> List[Incident]:
        detected = detect_incidents(session)
        incidents: List[Incident] = []
        for item in detected:
            incident = self._create_or_update(session, item)
            incidents.append(incident)
        return incidents

    def _create_or_update(self, session: Session, item: DetectedIncident) -> Incident:
        existing = session.exec(
            select(Incident).where(
                Incident.signature == item.signature,
                Incident.status == "open",
            )
        ).first()
        now = datetime.now(timezone.utc)
        if existing:
            existing.updated_at = now
            existing.services = sorted(set(existing.services + item.services))
            existing.evidence_log_ids = sorted(set(existing.evidence_log_ids + item.evidence_log_ids))
            session.add(existing)
            session.commit()
            session.refresh(existing)
            return existing

        incident = Incident(
            created_at=now,
            updated_at=now,
            severity=item.severity,
            services=item.services,
            title=item.title,
            signature=item.signature,
            evidence_log_ids=item.evidence_log_ids,
            status="open",
        )
        session.add(incident)
        session.commit()
        session.refresh(incident)
        return incident
