#!/bin/sh
set -eu

# Optional: wait for external tunnel sidecar (if SSH handled outside the app)
if [ "${WAIT_FOR_TUNNEL:-false}" = "true" ]; then
  host="${TUNNEL_WAIT_HOST:-127.0.0.1}"
  port="${SSH_LOCAL_PORT:-18080}"
  echo "[entrypoint] waiting for tunnel ${host}:${port}..."
  i=0
  while [ "$i" -lt 60 ]; do
    if nc -z "$host" "$port" 2>/dev/null; then
      echo "[entrypoint] tunnel is up"
      break
    fi
    i=$((i + 1))
    sleep 1
  done
fi

exec node dist/index.js
