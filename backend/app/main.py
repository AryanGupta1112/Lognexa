import asyncio
import json
import threading
import time
from datetime import datetime, timezone
from typing import Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlmodel import Session, select

from .config import settings
from .db import init_db, engine
from .log_collector import DockerLogCollector
from .models import LogEntry
from .routes import router
from .incident_manager import IncidentManager
from .sse import LogBroadcaster


app = FastAPI(title="LOGNEXA API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

app.include_router(router)


def seed_if_empty():
    with Session(engine) as session:
        count = session.exec(select(LogEntry)).first()
        if count:
            return
        now = datetime.now(timezone.utc)
        sample = [
            LogEntry(
                timestamp=now,
                service="service-a",
                container_id="seed-a",
                level="INFO",
                message="Service started",
                raw="Service started",
                tags={"seed": True},
            ),
            LogEntry(
                timestamp=now,
                service="service-b",
                container_id="seed-b",
                level="ERROR",
                message="DB connection refused",
                raw="DB connection refused",
                tags={"seed": True},
            ),
        ]
        session.add_all(sample)
        session.commit()


@app.on_event("startup")
async def startup():
    init_db()
    seed_if_empty()
    app.state.loop = asyncio.get_event_loop()
    app.state.broadcaster = LogBroadcaster()
    app.state.stop_event = threading.Event()

    def on_log(log_data):
        with Session(engine) as session:
            entry = LogEntry(**log_data)
            session.add(entry)
            session.commit()
            session.refresh(entry)
            event = {
                "id": entry.id,
                "timestamp": entry.timestamp.isoformat(),
                "service": entry.service,
                "container_id": entry.container_id,
                "level": entry.level,
                "message": entry.message,
                "raw": entry.raw,
                "tags": entry.tags,
            }

        if app.state.loop:
            asyncio.run_coroutine_threadsafe(
                app.state.broadcaster.publish(event),
                app.state.loop,
            )

    collector = DockerLogCollector(on_log=on_log)
    collector.start()
    app.state.collector = collector

    incident_manager = IncidentManager()
    app.state.incident_manager = incident_manager

    def incident_loop():
        while not app.state.stop_event.is_set():
            with Session(engine) as session:
                incident_manager.scan(session)
            time.sleep(settings.incident_scan_interval)

    thread = threading.Thread(target=incident_loop, daemon=True)
    thread.start()
    app.state.incident_thread = thread


@app.on_event("shutdown")
async def shutdown():
    app.state.stop_event.set()
    app.state.collector.stop()


@app.get("/api/stream/logs")
async def stream_logs(service: Optional[str] = None, level: Optional[str] = None):
    broadcaster: LogBroadcaster = app.state.broadcaster
    queue = await broadcaster.subscribe()

    async def event_generator():
        try:
            while True:
                event = await queue.get()
                if service and event.get("service") != service:
                    continue
                if level and event.get("level") != level:
                    continue
                yield f"data: {json.dumps(event)}\n\n"
        finally:
            await broadcaster.unsubscribe(queue)

    return StreamingResponse(event_generator(), media_type="text/event-stream")
