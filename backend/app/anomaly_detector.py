import re
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import List, Dict

from sqlmodel import Session, select

from .models import LogEntry


@dataclass
class DetectedIncident:
    signature: str
    title: str
    severity: str
    services: List[str]
    evidence_log_ids: List[int]


SIGNATURE_PATTERNS = [
    (re.compile(r"db connection refused", re.IGNORECASE), "Database connection refused", "high"),
    (re.compile(r"timeout", re.IGNORECASE), "Upstream timeout", "medium"),
    (re.compile(r"out of memory|oom", re.IGNORECASE), "Out of memory", "high"),
    (re.compile(r"address already in use|port .* in use", re.IGNORECASE), "Port binding failure", "high"),
]


def detect_incidents(session: Session, window_minutes: int = 5) -> List[DetectedIncident]:
    now = datetime.now(timezone.utc)
    since = now - timedelta(minutes=window_minutes)
    logs = session.exec(select(LogEntry).where(LogEntry.timestamp >= since)).all()

    incidents: List[DetectedIncident] = []

    # Error burst detection
    error_logs: Dict[str, List[LogEntry]] = {}
    for log in logs:
        if log.level == "ERROR":
            error_logs.setdefault(log.service, []).append(log)

    for service, entries in error_logs.items():
        if len(entries) >= 5:
            incidents.append(
                DetectedIncident(
                    signature=f"error_burst:{service}",
                    title=f"Error burst detected in {service}",
                    severity="high" if len(entries) >= 10 else "medium",
                    services=[service],
                    evidence_log_ids=[e.id for e in entries[-20:]],
                )
            )

    # Signature pattern detection
    for pattern, title, severity in SIGNATURE_PATTERNS:
        matched = [log for log in logs if pattern.search(log.message)]
        if len(matched) >= 3:
            services = sorted({log.service for log in matched})
            incidents.append(
                DetectedIncident(
                    signature=f"sig:{pattern.pattern}",
                    title=title,
                    severity=severity,
                    services=services,
                    evidence_log_ids=[e.id for e in matched[-20:]],
                )
            )

    # Restart/crash pattern
    restart_logs = [log for log in logs if re.search(r"restart|crash|exited", log.message, re.IGNORECASE)]
    if len(restart_logs) >= 3:
        services = sorted({log.service for log in restart_logs})
        incidents.append(
            DetectedIncident(
                signature="restart_pattern",
                title="Repeated restarts detected",
                severity="medium",
                services=services,
                evidence_log_ids=[e.id for e in restart_logs[-20:]],
            )
        )

    return incidents
