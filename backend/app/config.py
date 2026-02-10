import os
from typing import List


def _split_csv(value: str) -> List[str]:
    if not value:
        return []
    return [v.strip() for v in value.split(",") if v.strip()]


class Settings:
    def __init__(self) -> None:
        self.database_url = os.getenv("DATABASE_URL", "sqlite:///./data/lognexa.db")
        self.cors_origins = _split_csv(os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:5173"))
        self.log_level = os.getenv("LOG_LEVEL", "info")
        self.ollama_base_url = os.getenv("OLLAMA_BASE_URL", "").strip()
        self.ollama_model = os.getenv("OLLAMA_MODEL", "llama3")
        self.hf_token = os.getenv("HF_TOKEN", "").strip()
        self.hf_model = os.getenv("HF_MODEL", "mistralai/Mistral-7B-Instruct-v0.2")
        self.log_stream_batch = int(os.getenv("LOG_STREAM_BATCH", "200"))
        self.ai_timeout = int(os.getenv("AI_TIMEOUT", "30"))
        self.incident_scan_interval = int(os.getenv("INCIDENT_SCAN_INTERVAL", "20"))


settings = Settings()
