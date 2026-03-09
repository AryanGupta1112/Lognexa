from dataclasses import dataclass
from threading import Lock
from typing import Iterable, List, Optional, Sequence, Set

from qdrant_client import QdrantClient, models

from .config import settings
from .models import LogEntry


@dataclass
class RagMatch:
    log_id: int
    score: float
    service: str
    level: str
    timestamp: str
    message: str
    container_id: str


def _document_text(log: LogEntry) -> str:
    return f"service={log.service} level={log.level} message={log.message} raw={log.raw}"


class VectorStore:
    def __init__(self) -> None:
        self._client: Optional[QdrantClient] = None
        self._connect_lock = Lock()
        self._operation_lock = Lock()
        self._vector_name: Optional[str] = None
        self._collection_ready = False
        self.available = False

    def _ensure_client(self) -> Optional[QdrantClient]:
        if not settings.vector_enabled:
            self.available = False
            return None

        if self._client:
            return self._client

        with self._connect_lock:
            if self._client:
                return self._client

            client = QdrantClient(url=settings.qdrant_url, timeout=settings.vector_timeout)
            client.set_model(settings.vector_model)
            client.get_collections()
            self._vector_name = client.get_vector_field_name()
            self._client = client
            self.available = True
            return client

    def is_available(self) -> bool:
        try:
            client = self._ensure_client()
            if not client:
                return False
            with self._operation_lock:
                client.get_collections()
            self.available = True
            return True
        except Exception:
            self.available = False
            return False

    def index_log(self, log: LogEntry) -> bool:
        return self.index_logs([log]) > 0

    def index_logs(self, logs: Sequence[LogEntry]) -> int:
        valid_logs = [log for log in logs if log.id is not None]
        if not valid_logs:
            return 0

        try:
            client = self._ensure_client()
            if not client:
                return 0

            with self._operation_lock:
                if not self._collection_ready:
                    client.create_collection(
                        settings.vector_collection,
                        vectors_config=client.get_fastembed_vector_params(),
                    )
                    self._collection_ready = True

                client.upsert(
                    collection_name=settings.vector_collection,
                    points=[
                        models.PointStruct(
                            id=log.id,
                            vector={
                                self._vector_name or client.get_vector_field_name(): models.Document(
                                    text=_document_text(log),
                                    model=settings.vector_model,
                                )
                            },
                            payload={
                                "log_id": log.id,
                                "service": log.service,
                                "level": log.level,
                                "timestamp": log.timestamp.isoformat(),
                                "container_id": log.container_id,
                                "message": log.message,
                                "raw": log.raw,
                            },
                        )
                        for log in valid_logs
                    ],
                )
            self.available = True
            return len(valid_logs)
        except Exception:
            self._collection_ready = False
            self.available = False
            return 0

    def search_related_logs(
        self,
        *,
        query_text: str,
        services: Optional[Iterable[str]] = None,
        exclude_ids: Optional[Set[int]] = None,
        limit: int = 6,
    ) -> List[RagMatch]:
        if not query_text.strip():
            return []

        try:
            client = self._ensure_client()
            if not client:
                return []

            service_filter = set(services or [])
            excluded = exclude_ids or set()
            search_limit = max(limit * 4, limit)

            with self._operation_lock:
                response = client.query_points(
                    collection_name=settings.vector_collection,
                    query=models.Document(text=query_text, model=settings.vector_model),
                    using=self._vector_name or client.get_vector_field_name(),
                    limit=search_limit,
                    with_payload=True,
                )

            matches: List[RagMatch] = []
            for hit in response.points:
                meta = hit.payload or {}
                log_id = meta.get("log_id")
                service = meta.get("service", "")
                if not isinstance(log_id, int):
                    continue
                if service_filter and service not in service_filter:
                    continue
                if log_id in excluded:
                    continue

                matches.append(
                    RagMatch(
                        log_id=log_id,
                        score=float(hit.score or 0.0),
                        service=service,
                        level=meta.get("level", ""),
                        timestamp=meta.get("timestamp", ""),
                        message=meta.get("message", ""),
                        container_id=meta.get("container_id", ""),
                    )
                )
                if len(matches) >= limit:
                    break

            self.available = True
            return matches
        except Exception:
            self.available = False
            return []
