#!/usr/bin/env bash
set -e

PORT="${PORT:-8002}"
export QUANTUM_ENGINE_URL="${QUANTUM_ENGINE_URL:-http://127.0.0.1:8003}"

echo "=================================================="
echo " Starting Quantum Guru Services on Railway"
echo " API Gateway Port: $PORT"
echo " Internal Engine:  $QUANTUM_ENGINE_URL"
echo "=================================================="

# Start internal AI Engine in background on 127.0.0.1:8003
python -m uvicorn app:app --app-dir v3/engine --host 127.0.0.1 --port 8003 &

# Wait 2 seconds for engine to initialize
sleep 2

# Start public API Gateway on $PORT (foreground)
exec python -m uvicorn main_v3:app --app-dir v3/api --host 0.0.0.0 --port "$PORT"
