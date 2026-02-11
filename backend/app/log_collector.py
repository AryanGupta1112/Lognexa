import random
import threading
import time
from datetime import datetime, timezone
from typing import Callable, Dict, Any, List

import docker
from docker.errors import DockerException

from .log_preprocessor import normalize_log, split_docker_line


class DockerLogCollector:
    def __init__(self, on_log: Callable[[Dict[str, Any]], None]) -> None:
        self.on_log = on_log
        self.stop_event = threading.Event()
        self.threads: List[threading.Thread] = []
        self.client = None
        self.available = False
        self.container_cache: List[Dict[str, Any]] = []

    def start(self) -> None:
        try:
            self.client = docker.from_env()
            self.client.ping()
            self.available = True
        except DockerException:
            self.available = False
            self._start_fallback()
            return

        self._refresh_container_cache()
        for container in self.client.containers.list():
            thread = threading.Thread(target=self._stream_container_logs, args=(container,), daemon=True)
            thread.start()
            self.threads.append(thread)

    def stop(self) -> None:
        self.stop_event.set()

    def _refresh_container_cache(self) -> None:
        if not self.client:
            return
        self.container_cache = []
        for container in self.client.containers.list():
            service = container.labels.get("com.docker.compose.service", container.name)
            self.container_cache.append(
                {
                    "id": container.id[:12],
                    "name": container.name,
                    "service": service,
                    "image": container.image.tags[0] if container.image.tags else container.image.short_id,
                    "status": container.status,
                }
            )

    def _stream_container_logs(self, container) -> None:
        service = container.labels.get("com.docker.compose.service", container.name)
        tags = {
            "image": container.image.tags[0] if container.image.tags else container.image.short_id,
            "compose_project": container.labels.get("com.docker.compose.project", ""),
            "container_name": container.name,
        }
        try:
            logs = container.logs(stream=True, follow=True, timestamps=True, tail=10)
            for line in logs:
                if self.stop_event.is_set():
                    break
                timestamp, message, raw = split_docker_line(line)
                log = normalize_log(
                    timestamp=timestamp,
                    service=service,
                    container_id=container.id[:12],
                    message=message,
                    raw=raw,
                    tags=tags,
                )
                self.on_log(log)
        except Exception:
            # If a container log stream fails, we don't stop the collector
            return

    def list_containers(self) -> List[Dict[str, Any]]:
        if self.available and self.client:
            try:
                self._refresh_container_cache()
                return self.container_cache
            except Exception:
                pass
        return self._fallback_containers()

    def _start_fallback(self) -> None:
        thread = threading.Thread(target=self._fallback_generator, daemon=True)
        thread.start()
        self.threads.append(thread)

    def _fallback_containers(self) -> List[Dict[str, Any]]:
        return [
            {
                "id": "fallback-a",
                "name": "service-a",
                "service": "service-a",
                "image": "fallback/service-a",
                "status": "running",
            },
            {
                "id": "fallback-b",
                "name": "service-b",
                "service": "service-b",
                "image": "fallback/service-b",
                "status": "running",
            },
        ]

    def _fallback_generator(self) -> None:
        messages = [
            "Request completed in 120ms",
            "DB connection refused",
            "Cache warm-up complete",
            "Timeout while waiting for upstream",
            "Task completed successfully",
            "Unhandled exception in handler",
            "Worker heartbeat ok",
            "Out of memory while allocating buffer",
            "User login succeeded",
        ]
        services = ["service-a", "service-b"]
        while not self.stop_event.is_set():
            time.sleep(random.uniform(0.4, 1.2))
            message = random.choice(messages)
            service = random.choice(services)
            log = normalize_log(
                timestamp=datetime.now(timezone.utc),
                service=service,
                container_id=f"fallback-{service}",
                message=message,
                raw=message,
                tags={"fallback": True},
            )
            self.on_log(log)
