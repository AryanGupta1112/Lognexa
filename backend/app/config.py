import os
from pathlib import Path
from typing import List

from dotenv import load_dotenv


_BACKEND_DIR = Path(__file__).resolve().parents[1]
load_dotenv(_BACKEND_DIR / ".env")


def _split_csv(value: str) -> List[str]:
    if not value:
        return []
    return [v.strip() for v in value.split(",") if v.strip()]


def _as_bool(value: str, default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


class Settings:
    def __init__(self) -> None:
        self.database_url = os.getenv("DATABASE_URL", "sqlite:///./data/lognexa.db")
        self.cors_origins = _split_csv(os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:5173"))
        self.log_level = os.getenv("LOG_LEVEL", "info")
        self.groq_api_key = os.getenv("GROQ_API_KEY", "").strip()
        self.groq_model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile").strip() or "llama-3.3-70b-versatile"
        self.groq_base_url = os.getenv("GROQ_BASE_URL", "https://api.groq.com/openai/v1").strip()
        self.log_stream_batch = int(os.getenv("LOG_STREAM_BATCH", "200"))
        self.ai_timeout = int(os.getenv("AI_TIMEOUT", "30"))
        self.incident_scan_interval = int(os.getenv("INCIDENT_SCAN_INTERVAL", "20"))
        self.vector_enabled = _as_bool(os.getenv("VECTOR_ENABLED"), default=True)
        self.qdrant_url = os.getenv("QDRANT_URL", "http://localhost:6333").strip()
        self.vector_collection = os.getenv("VECTOR_COLLECTION", "lognexa_logs").strip() or "lognexa_logs"
        self.vector_model = os.getenv("VECTOR_MODEL", "BAAI/bge-small-en-v1.5").strip() or "BAAI/bge-small-en-v1.5"
        self.vector_timeout = int(os.getenv("VECTOR_TIMEOUT", "10"))
        self.rag_context_limit = int(os.getenv("RAG_CONTEXT_LIMIT", "6"))
        self.collector_exclude_services = set(
            _split_csv(os.getenv("COLLECTOR_EXCLUDE_SERVICES", "backend,qdrant,frontend"))
        )


settings = Settings()
