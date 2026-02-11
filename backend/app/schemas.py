from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class LogEntryRead(BaseModel):
    id: int
    timestamp: datetime
    service: str
    container_id: str
    level: str
    message: str
    raw: str
    tags: Dict[str, Any]


class IncidentRead(BaseModel):
    id: int
    created_at: datetime
    updated_at: datetime
    severity: str
    services: List[str]
    title: str
    signature: str
    evidence_log_ids: List[int]
    status: str
    ai_summary: Optional[str] = None
    ai_root_cause: Optional[str] = None
    ai_confidence: Optional[float] = None
    ai_actions: List[str] = Field(default_factory=list)
    ai_related_signals: List[str] = Field(default_factory=list)


class IncidentAnalyzeResponse(BaseModel):
    id: int
    ai_summary: Optional[str] = None
    ai_root_cause: Optional[str] = None
    ai_confidence: Optional[float] = None
    ai_actions: List[str] = Field(default_factory=list)
    ai_related_signals: List[str] = Field(default_factory=list)
    status: str


class ContainerInfo(BaseModel):
    id: str
    name: str
    service: str
    image: str
    status: str


class HealthResponse(BaseModel):
    status: str
    time: datetime
    llm: Dict[str, Any]
