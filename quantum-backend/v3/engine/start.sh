#!/usr/bin/env bash
# ============================================================
# OptiOS Quantum AI Engine — Production Startup Script
# ============================================================
set -euo pipefail

# ── Config ────────────────────────────────────────────────
WORKERS="${WORKERS:-1}"             # 1 worker is default since LLM pipeline is async & vLLM handles batching
PORT="${PORT:-8003}"
HOST="${HOST:-0.0.0.0}"
APP="app:app"
TIMEOUT="${TIMEOUT:-300}"          # 5 minutes timeout per request (AI agent chains are long)
KEEPALIVE="${KEEPALIVE:-5}"
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

# ── Download FAISS database files if missing ──────────────
cd "$SCRIPT_DIR"

if [ ! -f "knowledge_index.faiss" ] && [ -n "${FAISS_INDEX_URL:-}" ]; then
    echo "[start.sh] Downloading vector retrieval index from ${FAISS_INDEX_URL}..."
    wget -q -O knowledge_index.faiss "${FAISS_INDEX_URL}"
fi

if [ ! -f "knowledge_metadata.json" ] && [ -n "${FAISS_METADATA_URL:-}" ]; then
    echo "[start.sh] Downloading vector retrieval metadata from ${FAISS_METADATA_URL}..."
    wget -q -O knowledge_metadata.json "${FAISS_METADATA_URL}"
fi

# ── Validate gunicorn is installed ────────────────────────
if ! command -v gunicorn &>/dev/null; then
    echo "[ERROR] gunicorn not found. Install with: pip install gunicorn uvicorn[standard]"
    exit 1
fi

# ── Start ─────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║      OptiOS Quantum AI Engine (Production)   ║"
echo "╠══════════════════════════════════════════════╣"
echo "║  Host:       $HOST:$PORT"
echo "║  Workers:    $WORKERS (UvicornWorker)"
echo "║  Timeout:    ${TIMEOUT}s per request"
echo "╚══════════════════════════════════════════════╝"
echo ""

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
