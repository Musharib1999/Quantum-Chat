#!/usr/bin/env bash
# ============================================================
# OptiOS API Gateway — Production Startup Script
# ============================================================
set -euo pipefail

# ── Config ────────────────────────────────────────────────
WORKERS="${WORKERS:-4}"
PORT="${PORT:-8002}"
HOST="${HOST:-0.0.0.0}"
APP="main_v3:app"
TIMEOUT="${TIMEOUT:-120}"          # seconds per request before worker recycles
KEEPALIVE="${KEEPALIVE:-5}"        # seconds to keep idle connections open
GRACEFUL_TIMEOUT="${GRACEFUL_TIMEOUT:-30}"

# ── Load .env if present (3 directories up from this script) ──
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../../../.env"
if [ -f "$ENV_FILE" ]; then
    set -a
    # shellcheck disable=SC1090
    source "$ENV_FILE"
    set +a
    echo "[start.sh] Loaded .env from $ENV_FILE"
else
    echo "[start.sh] Warning: .env not found at $ENV_FILE"
fi

# ── Validate gunicorn is installed ────────────────────────
if ! command -v gunicorn &>/dev/null; then
    echo "[ERROR] gunicorn not found. Install with: pip install gunicorn uvicorn[standard]"
    exit 1
fi

# ── Start ─────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║        OptiOS API Gateway (Production)       ║"
echo "╠══════════════════════════════════════════════╣"
echo "║  Host:       $HOST:$PORT"
echo "║  Workers:    $WORKERS (UvicornWorker)"
echo "║  Timeout:    ${TIMEOUT}s per request"
echo "║  Engine URL: ${QUANTUM_ENGINE_URL:-http://localhost:8003}"
echo "╚══════════════════════════════════════════════╝"
echo ""

# Change to the script directory to run gunicorn successfully
cd "$SCRIPT_DIR"

exec gunicorn "$APP" \
    --worker-class uvicorn.workers.UvicornWorker \
    --workers "$WORKERS" \
    --bind "$HOST:$PORT" \
    --timeout "$TIMEOUT" \
    --keepalive "$KEEPALIVE" \
    --graceful-timeout "$GRACEFUL_TIMEOUT" \
    --log-level info \
    --access-logfile - \
    --error-logfile - \
    --forwarded-allow-ips "*"
