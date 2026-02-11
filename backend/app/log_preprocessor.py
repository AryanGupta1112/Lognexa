import re
from datetime import datetime, timezone
from typing import Dict, Any, Tuple

LEVEL_PATTERNS = {
    "ERROR": [r"\bERROR\b", r"\bERR\b", r"Exception", r"Traceback", r"panic", r"fatal"],
    "WARN": [r"\bWARN\b", r"\bWARNING\b", r"timeout", r"timed out"],
    "DEBUG": [r"\bDEBUG\b"],
    "INFO": [r"\bINFO\b"],
}


def infer_level(message: str) -> str:
    for level, patterns in LEVEL_PATTERNS.items():
        for pattern in patterns:
            if re.search(pattern, message, re.IGNORECASE):
                return level
    return "INFO"


def parse_timestamp(ts: str) -> datetime:
    try:
        if ts.endswith("Z"):
            ts = ts.replace("Z", "+00:00")
        return datetime.fromisoformat(ts)
    except Exception:
        return datetime.now(timezone.utc)


def normalize_log(
    *,
    timestamp: datetime,
    service: str,
    container_id: str,
    message: str,
    raw: str,
    tags: Dict[str, Any],
) -> Dict[str, Any]:
    level = infer_level(message)
    return {
        "timestamp": timestamp,
        "service": service,
        "container_id": container_id,
        "level": level,
        "message": message.strip(),
        "raw": raw,
        "tags": tags,
    }


def split_docker_line(line: bytes) -> Tuple[datetime, str, str]:
    text = line.decode(errors="ignore").rstrip("\n")
    if " " in text[:40]:
        ts_str, rest = text.split(" ", 1)
        return parse_timestamp(ts_str), rest, text
    return datetime.now(timezone.utc), text, text
