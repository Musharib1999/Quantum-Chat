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

# 1. Start Python API (Port 8002)
echo "[*] Starting API Gateway (Port 8002)..."
cd quantum-backend/v3
nohup python3 -m uvicorn api.main_v3:app --host 0.0.0.0 --port 8002 > api_server.log 2>&1 &

# 2. Start Python AI Engine (Port 8003)
echo "[*] Starting AI Engine (Port 8003)..."
nohup python3 -m uvicorn engine.app:app --host 0.0.0.0 --port 8003 > engine_server.log 2>&1 &

# 3. Start Next.js Frontend (Port 3000)
echo "[*] Starting Next.js Frontend (Port 3000)..."
cd ../..
nohup npm run dev > dev_server.log 2>&1 &

sleep 5
echo "[*] All servers restarted. Checking status:"
lsof -i :3000 -i :8002 -i :8003
