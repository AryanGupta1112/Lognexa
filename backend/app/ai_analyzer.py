import json
import re
from typing import Any, Dict, List, Optional

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from .config import settings
from .models import Incident, LogEntry
from .vector_store import RagMatch


LLM_NOT_CONFIGURED = {
    "summary": "Groq not configured",
    "likely_root_cause": "No Groq API key is configured.",
    "confidence": 0.0,
    "recommended_actions": [
        "Set GROQ_API_KEY in the backend environment",
        f"Optionally override GROQ_MODEL (default: {settings.groq_model})",
    ],
    "related_signals": [],
}


def build_log_selection_query(logs: List[LogEntry]) -> str:
    services = sorted({log.service for log in logs})
    log_lines = "\n".join(f"{log.service} {log.level}: {log.message}" for log in logs[-10:])
    return (
        "Selected logs for analysis\n"
        f"Services: {', '.join(services) or 'Unknown'}\n"
        "Recent evidence:\n"
        f"{log_lines}"
    )


def build_retrieval_query(incident: Incident, logs: List[LogEntry]) -> str:
    log_lines = "\n".join(f"{log.service} {log.level}: {log.message}" for log in logs[-10:])
    return (
        f"Incident: {incident.title}\n"
        f"Severity: {incident.severity}\n"
        f"Services: {', '.join(incident.services)}\n"
        f"Signature: {incident.signature}\n"
        f"Recent evidence:\n{log_lines}"
    )


def _build_prompt(incident: Incident, logs: List[LogEntry], rag_matches: Optional[List[RagMatch]] = None) -> str:
    log_lines = "\n".join(
        f"[{log.timestamp.isoformat()}] {log.service} {log.level}: {log.message}" for log in logs[-50:]
    )
    rag_lines = "\n".join(
        f"[score={match.score:.3f}] [{match.timestamp}] {match.service} {match.level}: {match.message}"
        for match in (rag_matches or [])
    )
    return (
        "You are an SRE assistant. Analyze the incident and produce STRICT JSON only.\n"
        "Use both the direct incident evidence and the retrieved historical context.\n"
        "Return this exact JSON shape with double quotes:\n"
        "{\n"
        '  "summary": "...",\n'
        '  "likely_root_cause": "...",\n'
        '  "confidence": 0.0,\n'
        '  "recommended_actions": ["..."],\n'
        '  "related_signals": ["..."]\n'
        "}\n\n"
        f"Incident: {incident.title}\n"
        f"Severity: {incident.severity}\n"
        f"Services: {', '.join(incident.services)}\n"
        f"Signature: {incident.signature}\n\n"
        "Recent logs:\n"
        f"{log_lines or 'None'}\n\n"
        "Retrieved historical context from the vector database:\n"
        f"{rag_lines or 'None'}\n"
    )


def _build_log_selection_prompt(logs: List[LogEntry], rag_matches: Optional[List[RagMatch]] = None) -> str:
    services = sorted({log.service for log in logs})
    log_lines = "\n".join(
        f"[{log.timestamp.isoformat()}] {log.service} {log.level}: {log.message}" for log in logs[-50:]
    )
    rag_lines = "\n".join(
        f"[score={match.score:.3f}] [{match.timestamp}] {match.service} {match.level}: {match.message}"
        for match in (rag_matches or [])
    )
    return (
        "You are an SRE assistant. Analyze the selected logs and produce STRICT JSON only.\n"
        "Use both the selected logs and the retrieved historical context.\n"
        "Return this exact JSON shape with double quotes:\n"
        "{\n"
        '  "summary": "...",\n'
        '  "likely_root_cause": "...",\n'
        '  "confidence": 0.0,\n'
        '  "recommended_actions": ["..."],\n'
        '  "related_signals": ["..."]\n'
        "}\n\n"
        f"Services: {', '.join(services) or 'Unknown'}\n"
        f"Selected log count: {len(logs)}\n\n"
        "Selected logs:\n"
        f"{log_lines or 'None'}\n\n"
        "Retrieved historical context from the vector database:\n"
        f"{rag_lines or 'None'}\n"
    )


def _fix_prompt(raw_response: str) -> str:
    return (
        "Fix the following response into STRICT JSON only. "
        "Return only JSON, no prose.\n\n"
        f"Response:\n{raw_response}\n"
    )


def _extract_json(text: str) -> Dict[str, Any]:
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        raise ValueError("No JSON object found")
    return json.loads(match.group(0))


def _extract_message_content(payload: Dict[str, Any]) -> str:
    choices = payload.get("choices")
    if not isinstance(choices, list) or not choices:
        raise ValueError("No choices returned from Groq")

    message = choices[0].get("message", {})
    content = message.get("content", "")
    if isinstance(content, str):
        return content

    if isinstance(content, list):
        parts: List[str] = []
        for item in content:
            if isinstance(item, dict) and item.get("type") == "text":
                parts.append(str(item.get("text", "")))
        return "\n".join(part for part in parts if part)

    return str(content)


@retry(stop=stop_after_attempt(2), wait=wait_exponential(multiplier=1, min=1, max=4))
async def _call_groq(prompt: str) -> str:
    headers = {
        "Authorization": f"Bearer {settings.groq_api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": settings.groq_model,
        "messages": [
            {
                "role": "system",
                "content": "You are a precise SRE incident analysis assistant. Return strict JSON only.",
            },
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.2,
        "response_format": {"type": "json_object"},
    }

    async with httpx.AsyncClient(timeout=settings.ai_timeout) as client:
        response = await client.post(
            f"{settings.groq_base_url}/chat/completions",
            headers=headers,
            json=payload,
        )
        response.raise_for_status()
        return _extract_message_content(response.json())


async def analyze_incident(
    incident: Incident,
    logs: List[LogEntry],
    rag_matches: Optional[List[RagMatch]] = None,
) -> Dict[str, Any]:
    if not settings.groq_api_key:
        return LLM_NOT_CONFIGURED

    prompt = _build_prompt(incident, logs, rag_matches=rag_matches)
    raw = ""

    try:
        raw = await _call_groq(prompt)
        return _extract_json(raw)
    except Exception:
        raw_fix = await _call_groq(_fix_prompt(raw or prompt))
        return _extract_json(raw_fix)


async def analyze_log_selection(
    logs: List[LogEntry],
    rag_matches: Optional[List[RagMatch]] = None,
) -> Dict[str, Any]:
    if not settings.groq_api_key:
        return LLM_NOT_CONFIGURED

    prompt = _build_log_selection_prompt(logs, rag_matches=rag_matches)
    raw = ""

    try:
        raw = await _call_groq(prompt)
        return _extract_json(raw)
    except Exception:
        raw_fix = await _call_groq(_fix_prompt(raw or prompt))
        return _extract_json(raw_fix)
