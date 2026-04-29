#!/usr/bin/env bash
set -euo pipefail

BASEDIR="$(cd "$(dirname "$0")" && pwd)"
log(){ printf "[%s] %s\n" "$(date +'%H:%M:%S')" "$*"; }

stop_pidfile() {
  pidfile="$1"
  if [ -f "$pidfile" ]; then
    pid=$(cat "$pidfile" 2>/dev/null || true)
    if [ -n "$pid" ]; then
      log "Stopping PID $pid from $pidfile"
      kill "$pid" 2>/dev/null || true
      sleep 1
      # kill child processes if any
      if command -v pgrep >/dev/null 2>&1; then
        children=$(pgrep -P "$pid" || true)
        if [ -n "$children" ]; then
          log "Stopping child PIDs: $children"
          kill $children 2>/dev/null || true
        fi
      fi
      sleep 1
      kill -0 "$pid" 2>/dev/null && kill -9 "$pid" 2>/dev/null || true
    fi
    rm -f "$pidfile"
  else
    log "No $pidfile"
  fi
}

stop_pidfile "$BASEDIR/.frontend.pid"
stop_pidfile "$BASEDIR/.backend.pid"

log "Stopping any remaining frontend/backend listeners on common ports"
command -v lsof >/dev/null 2>&1 && lsof -nP -iTCP:5173,4173,8000 -sTCP:LISTEN | awk 'NR>1{print $2}' | xargs -r kill -9 2>/dev/null || true

log "Stopped."
