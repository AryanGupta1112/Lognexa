import asyncio
from typing import Any, Dict, Set


class LogBroadcaster:
    def __init__(self) -> None:
        self.subscribers: Set[asyncio.Queue] = set()
        self.lock = asyncio.Lock()

    async def subscribe(self) -> asyncio.Queue:
        queue: asyncio.Queue = asyncio.Queue(maxsize=500)
        async with self.lock:
            self.subscribers.add(queue)
        return queue

    async def unsubscribe(self, queue: asyncio.Queue) -> None:
        async with self.lock:
            self.subscribers.discard(queue)

    async def publish(self, event: Dict[str, Any]) -> None:
        async with self.lock:
            for queue in list(self.subscribers):
                if queue.full():
                    try:
                        queue.get_nowait()
                    except Exception:
                        pass
                await queue.put(event)
