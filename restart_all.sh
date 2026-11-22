#!/usr/bin/env bash
# ============================================================
# Restart script for Quantum Guru (OptiOS)
# ============================================================

echo "[*] Killing existing servers on ports 3000, 8002, 8003..."
kill -9 $(lsof -t -i :3000 -i :8002 -i :8003) 2>/dev/null || true
sleep 2

# Verify they are dead
echo "[*] Verifying ports are clear..."
lsof -i :3000 -i :8002 -i :8003

# 1. Start Python API Gateway with in-process AI Engine (Loopback 127.0.0.1:8002 only)
echo "[*] Starting API Gateway (127.0.0.1:8002)..."
cd quantum-backend/v3
PYTHONPATH="..:." nohup python3 -m uvicorn v3.api.main_v3:app --host 127.0.0.1 --port 8002 > api_server.log 2>&1 &

# 2. Start Next.js Frontend (Loopback 127.0.0.1:3000 only)
echo "[*] Starting Next.js Frontend (127.0.0.1:3000)..."
cd ../..
nohup npx next dev -H 127.0.0.1 -p 3000 > dev_server.log 2>&1 &

sleep 5
echo "[*] All servers restarted. Checking status:"
lsof -i :3000 -i :8002 -i :8003
