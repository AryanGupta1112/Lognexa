from datetime import datetime
from typing import Optional, List, Dict, Any

from sqlmodel import SQLModel, Field
from sqlalchemy import Column, JSON


class LogEntry(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    timestamp: datetime = Field(index=True)
    service: str = Field(index=True)
    container_id: str = Field(index=True)
    level: str = Field(index=True)
    message: str
    raw: str
    tags: Dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))


class Incident(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(index=True)
    updated_at: datetime = Field(index=True)
    severity: str = Field(index=True)
    services: List[str] = Field(default_factory=list, sa_column=Column(JSON))
    title: str
    signature: str = Field(index=True)
    evidence_log_ids: List[int] = Field(default_factory=list, sa_column=Column(JSON))
    status: str = Field(default="open", index=True)
    ai_summary: Optional[str] = None
    ai_root_cause: Optional[str] = None
    ai_confidence: Optional[float] = None
    ai_actions: List[str] = Field(default_factory=list, sa_column=Column(JSON))
    ai_related_signals: List[str] = Field(default_factory=list, sa_column=Column(JSON))
