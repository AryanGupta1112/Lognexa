#!/usr/bin/env bash
set -e

SERVICE_URL=${SERVICE_URL:-http://localhost:3001}

for i in {1..8}; do
  curl -s "$SERVICE_URL/fail" >/dev/null || true
  sleep 0.2
  curl -s "$SERVICE_URL/" >/dev/null || true
  sleep 0.2
done

echo "Triggered simulated failure burst on service-a."
