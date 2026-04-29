#!/usr/bin/env bash
set -euo pipefail

# One-click build & run for frontend + backend (follows README steps)
# Usage: ./run_all.sh [dev|prod]

BASEDIR="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_DIR="$BASEDIR/frontend"
BACKEND_DIR="$BASEDIR"
VENV_DIR="$BASEDIR/.venv"

# Bind frontend explicitly to IPv4 to avoid IPv6-only binding problems
FRONTEND_HOST="127.0.0.1"
FRONTEND_PORT="5173"

MODE="${1:-dev}"

log() { printf "[%s] %s\n" "$(date +'%H:%M:%S')" "$*"; }

check_prereqs() {
  if ! command -v python3 >/dev/null 2>&1; then
    log "python3 not found — установите Python 3"
    exit 1
  fi
  if ! command -v npm >/dev/null 2>&1; then
    log "npm not found — установите Node.js и npm"
    exit 1
  fi
}

ensure_venv() {
  if [ ! -d "$VENV_DIR" ]; then
    log "Создаю виртуальное окружение .venv..."
    python3 -m venv "$VENV_DIR"
  fi
  # shellcheck disable=SC1091
  source "$VENV_DIR/bin/activate"
  pip install --upgrade pip setuptools wheel >/dev/null 2>&1 || true
}

install_backend_requirements() {
  if [ -f "$BACKEND_DIR/backend/requirements.txt" ]; then
    log "Устанавливаю Python-зависимости для backend..."
    pip install -r "$BACKEND_DIR/backend/requirements.txt"
  else
    log "backend/requirements.txt не найден — пропускаю установку зависимостей"
  fi
}

install_frontend_deps_if_needed() {
  if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
    log "Устанавливаю npm-зависимости (frontend)..."
    (cd "$FRONTEND_DIR" && npm install)
  else
    log "node_modules уже установлены — пропускаю npm install"
  fi
}

start_backend() {
  log "Запускаю backend (run_backend.py)..."
  cd "$BASEDIR"
  : >"$BASEDIR/backend.log"
  # Use virtualenv python
  "$VENV_DIR/bin/python" run_backend.py >>"$BASEDIR/backend.log" 2>&1 &
  BACKEND_PID=$!
  echo "$BACKEND_PID" >"$BASEDIR/.backend.pid" || true
  log "Backend PID: $BACKEND_PID (логи → backend.log, pid → .backend.pid)"
}

start_frontend_dev() {
  log "Запускаю frontend (dev)..."
  : >"$BASEDIR/frontend.log"
  cd "$FRONTEND_DIR"
  # force binding to IPv4 address and fixed port
  npm run dev -- --host "$FRONTEND_HOST" --port "$FRONTEND_PORT" >>"$BASEDIR/frontend.log" 2>&1 &
  FRONTEND_PID=$!
  echo "$FRONTEND_PID" >"$BASEDIR/.frontend.pid" || true
  log "Frontend PID: $FRONTEND_PID (логи → frontend.log, pid → .frontend.pid)"
  cd "$BASEDIR"
}

build_frontend() {
  log "Собираю frontend (build)..."
  cd "$FRONTEND_DIR"
  npm run build
  cd "$BASEDIR"
}

preview_frontend() {
  log "Запускаю preview сервера frontend..."
  : >"$BASEDIR/frontend.log"
  cd "$FRONTEND_DIR"
  npm run preview -- --host "$FRONTEND_HOST" --port "$FRONTEND_PORT" >>"$BASEDIR/frontend.log" 2>&1 &
  FRONTEND_PID=$!
  echo "$FRONTEND_PID" >"$BASEDIR/.frontend.pid" || true
  log "Frontend preview PID: $FRONTEND_PID (логи → frontend.log, pid → .frontend.pid)"
  cd "$BASEDIR"
}

wait_for_url() {
  url="$1"
  timeout="${2:-30}"
  log "Ожидаю доступности $url (timeout ${timeout}s)..."
  n=0
  until curl -sSf -o /dev/null "$url"; do
    sleep 1
    n=$((n+1))
    if [ "$n" -ge "$timeout" ]; then
      log "Таймаут ожидания $url"
      return 1
    fi
  done
  log "$url доступен"
  return 0
}

cleanup() {
  log "Останавливаю процессы..."
  # read pid files if variables are unset
  if [ -z "${FRONTEND_PID:-}" ] && [ -f "$BASEDIR/.frontend.pid" ]; then
    FRONTEND_PID=$(cat "$BASEDIR/.frontend.pid" 2>/dev/null || true)
  fi
  if [ -z "${BACKEND_PID:-}" ] && [ -f "$BASEDIR/.backend.pid" ]; then
    BACKEND_PID=$(cat "$BASEDIR/.backend.pid" 2>/dev/null || true)
  fi
  [ -n "${FRONTEND_PID:-}" ] && kill "${FRONTEND_PID}" 2>/dev/null || true
  [ -n "${BACKEND_PID:-}" ] && kill "${BACKEND_PID}" 2>/dev/null || true
  sleep 1
  [ -n "${FRONTEND_PID:-}" ] && kill -9 "${FRONTEND_PID}" 2>/dev/null || true
  [ -n "${BACKEND_PID:-}" ] && kill -9 "${BACKEND_PID}" 2>/dev/null || true
  rm -f "$BASEDIR/.frontend.pid" "$BASEDIR/.backend.pid"
  exit 0
}
trap cleanup INT TERM EXIT

log "Режим: $MODE"

check_prereqs
ensure_venv

if [ "$MODE" = "dev" ]; then
  install_frontend_deps_if_needed
  install_backend_requirements
  start_backend
  start_frontend_dev
  FRONT_URL="http://$FRONTEND_HOST:$FRONTEND_PORT"
  wait_for_url "$FRONT_URL" 60 || true
  log "Открываю браузер $FRONT_URL"
  if command -v open >/dev/null 2>&1; then
    open "$FRONT_URL" || true
  else
    xdg-open "$FRONT_URL" || true
  fi
elif [ "$MODE" = "prod" ]; then
  install_frontend_deps_if_needed
  install_backend_requirements
  build_frontend
  start_backend
  preview_frontend
  FRONT_URL="http://$FRONTEND_HOST:$FRONTEND_PORT"
  wait_for_url "$FRONT_URL" 60 || true
  log "Открываю браузер $FRONT_URL"
  if command -v open >/dev/null 2>&1; then
    open "$FRONT_URL" || true
  else
    xdg-open "$FRONT_URL" || true
  fi
else
  log "Неизвестный режим: $MODE. Используйте 'dev' или 'prod'."
  exit 2
fi

log "Серверы запущены. Нажмите Ctrl+C для завершения и остановки дочерних процессов."

# Ожидаем дочерние процессы
wait
