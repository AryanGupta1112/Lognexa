#!/usr/bin/env bash
set -e

SERVICE_URL=${SERVICE_URL:-http://localhost:3001}

for i in {1..20}; do
  curl -s "$SERVICE_URL/" >/dev/null || true
  sleep 0.3
  curl -s "$SERVICE_URL/health" >/dev/null || true
  sleep 0.3
  if (( RANDOM % 10 == 0 )); then
    curl -s "$SERVICE_URL/fail" >/dev/null || true
  fi
done

echo "Generated sample traffic against service-a."
