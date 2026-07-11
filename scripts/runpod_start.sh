#!/bin/bash
# Prime Blazar AI Engine - RunPod Startup Script
# This script starts vLLM and the FastAPI backend sequentially

echo "Starting vLLM Inference Engine (Qwen 32B AWQ)..."
nohup vllm serve Qwen/Qwen2.5-32B-Instruct-AWQ \
  --dtype auto \
  --quantization awq \
  --max-model-len 8192 \
  --gpu-memory-utilization 0.90 \
  --tensor-parallel-size 1 \
  --port 8000 > /root/vllm.log 2>&1 &

echo "Waiting for vLLM to initialize (checking port 8000)..."
# Loop until port 8000 responds to a basic curl
while ! curl -s http://localhost:8000/v1/models > /dev/null; do
    sleep 5
    echo -n "."
done
echo "vLLM is ONLINE!"

echo "Starting FastAPI Backend (Council of Experts Pipeline)..."
cd quantum-backend || exit
# Ensure dependencies are installed
pip install -r requirements_runpod.txt

# Start backend on 0.0.0.0 so RunPod proxy can expose it
nohup uvicorn v2.main_v2:app --host 0.0.0.0 --port 8002 > /root/backend.log 2>&1 &
echo "FastAPI backend started on port 8002."
echo "View logs with: tail -f /root/vllm.log /root/backend.log"
