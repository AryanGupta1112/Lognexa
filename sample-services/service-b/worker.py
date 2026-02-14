import random
import time
from datetime import datetime

messages = [
    "Processed batch successfully",
    "Queued 24 tasks",
    "Worker heartbeat ok",
    "DB connection refused",
    "Timeout while contacting upstream",
    "Cache warm-up complete"
]

while True:
    time.sleep(random.uniform(2, 5))
    message = random.choice(messages)
    level = "INFO"
    if "DB connection refused" in message:
        level = "ERROR"
    elif "Timeout" in message:
        level = "WARN"
    print(f"[{level}] {datetime.utcnow().isoformat()} {message}", flush=True)
