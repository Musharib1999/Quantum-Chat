#!/usr/bin/env bash
set -e

PORT="${PORT:-8002}"
export QUANTUM_ENGINE_URL="${QUANTUM_ENGINE_URL:-http://127.0.0.1:8003}"

PYTHON_BIN="$(command -v python3 || command -v python || echo "python3")"

echo "=================================================="
echo " Starting Quantum Guru Services on Railway"
echo " API Gateway Port: $PORT"
echo " Python Binary:    $PYTHON_BIN"
echo "=================================================="

# Start public API Gateway on $PORT (foreground)
# Routes both gateway endpoints and internal Quantum Engine via in-process ASGI dispatch
exec "$PYTHON_BIN" -m uvicorn main_v3:app --app-dir v3/api --host 0.0.0.0 --port "$PORT"
