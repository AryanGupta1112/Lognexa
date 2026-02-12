import json
import re
from typing import Any, Dict, List

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from .config import settings
from .models import Incident, LogEntry


LLM_NOT_CONFIGURED = {
    "summary": "LLM not configured",
    "likely_root_cause": "No local Ollama endpoint or Hugging Face token is configured.",
    "confidence": 0.0,
    "recommended_actions": [
        "Set OLLAMA_BASE_URL and ensure Ollama is running",
        "Or set HF_TOKEN and HF_MODEL to use Hugging Face Inference API",
    ],
    "related_signals": [],
}


def _build_prompt(incident: Incident, logs: List[LogEntry]) -> str:
    log_lines = "\n".join(
        f"[{log.timestamp.isoformat()}] {log.service} {log.level}: {log.message}" for log in logs[-50:]
    )
    return (
        "You are an SRE assistant. Analyze the incident and produce STRICT JSON only.\n"
        "Return this exact JSON shape with double quotes:\n"
        "{\n"
        "  \"summary\": \"...\",\n"
        "  \"likely_root_cause\": \"...\",\n"
        "  \"confidence\": 0.0,\n"
        "  \"recommended_actions\": [\"...\"],\n"
        "  \"related_signals\": [\"...\"]\n"
        "}\n\n"
        f"Incident: {incident.title}\n"
        f"Severity: {incident.severity}\n"
        f"Services: {', '.join(incident.services)}\n"
        f"Signature: {incident.signature}\n\n"
        "Recent logs:\n"
        f"{log_lines}\n"
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


@retry(stop=stop_after_attempt(2), wait=wait_exponential(multiplier=1, min=1, max=4))
async def _call_ollama(prompt: str) -> str:
    async with httpx.AsyncClient(timeout=settings.ai_timeout) as client:
        response = await client.post(
            f"{settings.ollama_base_url}/api/generate",
            json={"model": settings.ollama_model, "prompt": prompt, "stream": False},
        )
        response.raise_for_status()
        data = response.json()
        return data.get("response", "")


@retry(stop=stop_after_attempt(2), wait=wait_exponential(multiplier=1, min=1, max=4))
async def _call_hf(prompt: str) -> str:
    async with httpx.AsyncClient(timeout=settings.ai_timeout) as client:
        headers = {"Authorization": f"Bearer {settings.hf_token}"}
        response = await client.post(
            f"https://api-inference.huggingface.co/models/{settings.hf_model}",
            headers=headers,
            json={"inputs": prompt, "parameters": {"max_new_tokens": 400}},
        )
        response.raise_for_status()
        data = response.json()
        if isinstance(data, list) and data:
            return data[0].get("generated_text", "")
        if isinstance(data, dict):
            return data.get("generated_text", "")
        return str(data)


async def _run_provider(provider: str, prompt: str) -> Dict[str, Any]:
    if provider == "ollama":
        raw = await _call_ollama(prompt)
    else:
        raw = await _call_hf(prompt)

    try:
        return _extract_json(raw)
    except Exception:
        fix = _fix_prompt(raw)
        if provider == "ollama":
            raw_fix = await _call_ollama(fix)
        else:
            raw_fix = await _call_hf(fix)
        return _extract_json(raw_fix)


async def analyze_incident(incident: Incident, logs: List[LogEntry]) -> Dict[str, Any]:
    prompt = _build_prompt(incident, logs)

    if settings.ollama_base_url:
        try:
            return await _run_provider("ollama", prompt)
        except Exception:
            pass

    if settings.hf_token:
        try:
            return await _run_provider("hf", prompt)
        except Exception:
            pass

    return LLM_NOT_CONFIGURED
