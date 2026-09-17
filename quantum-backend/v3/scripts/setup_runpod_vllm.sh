#!/usr/bin/env bash
# ==============================================================================
# Quantum Guru — RunPod Single 48GB GPU Setup & Launch Script (A40 / CUDA 12.8)
# Model: Qwen/Qwen2.5-Coder-32B-Instruct-FP8
# ==============================================================================

set -e

echo "=== [1/5] Checking GPU Hardware ==="
if command -v nvidia-smi &> /dev/null; then
    nvidia-smi --query-gpu=name,memory.total --format=csv,noheader
else
    echo "[ERROR] nvidia-smi not found. Ensure NVIDIA CUDA drivers are loaded."
    exit 1
fi

echo "=== [2/5] Installing / Verifying vLLM ==="
pip install -q --upgrade pip
pip install -q vllm

echo "=== [3/5] Installing Cloudflare Tunnel (Zero-Buffering SSE Direct Stream) ==="
if ! command -v cloudflared &> /dev/null; then
    curl -L --output /tmp/cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
    dpkg -i /tmp/cloudflared.deb || apt-get install -f -y
    rm -f /tmp/cloudflared.deb
fi

echo "=== [4/5] Starting vLLM OpenAI API Server on Port 8000 ==="
echo "Model: Qwen/Qwen2.5-Coder-32B-Instruct-FP8"
echo "VRAM Allocation: 90% (~43.2 GB total; ~19.5 GB weights + ~23.7 GB KV Cache)"
echo "Max Context: 8192 tokens"

# Launch vLLM in background and log to /workspace/vllm.log
nohup python3 -m vllm.entrypoints.openai.api_server \
    --model Qwen/Qwen2.5-Coder-32B-Instruct-FP8 \
    --port 8000 \
    --host 0.0.0.0 \
    --max-model-len 8192 \
    --gpu-memory-utilization 0.90 \
    --trust-remote-code > /workspace/vllm.log 2>&1 &

VLLM_PID=$!
echo "vLLM started with PID $VLLM_PID. Waiting for server to become healthy on port 8000..."

# Wait for vLLM health endpoint
until curl -s http://localhost:8000/health > /dev/null; do
    echo "Waiting for weights to load into GPU VRAM (this may take 1-3 minutes)..."
    sleep 10
done
echo "[SUCCESS] vLLM server is healthy and responding on port 8000!"

echo "=== [5/5] Launching Cloudflare Tunnel ==="
nohup cloudflared tunnel --url http://localhost:8000 > /workspace/tunnel.log 2>&1 &
sleep 5

TUNNEL_URL=$(grep -o 'https://[-a-zA-Z0-9.]*\.trycloudflare\.com' /workspace/tunnel.log | head -n 1)

echo "=============================================================================="
echo "🎉 RUNPOD QWEN-32B INSTANCE IS READY FOR PRODUCTION / DEMO!"
echo "=============================================================================="
echo "Public Base URL:  ${TUNNEL_URL}/v1"
echo ""
echo "Configure this in your Railway Environment Variables or local .env:"
echo "  INFERENCE_PROVIDER=runpod"
echo "  QWEN_BASE_URL=${TUNNEL_URL}/v1"
echo "  QWEN_MODEL=Qwen/Qwen2.5-Coder-32B-Instruct-FP8"
echo "=============================================================================="
