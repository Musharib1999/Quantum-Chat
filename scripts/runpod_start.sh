#!/bin/bash
# Prime Blazar AI Engine - RunPod Startup Script
# This script starts vLLM, D-Wave Microservice, and the FastAPI backend

echo "Starting vLLM Inference Engine (Qwen 32B AWQ)..."
nohup vllm serve predibase/Qwen2.5-32B-Instruct-FP8 \
  --dtype auto \
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

cd quantum-backend || exit
# Ensure dependencies are installed
pip install -r requirements_runpod.txt

echo "Starting D-Wave Simulator Service (Port 8004)..."
nohup uvicorn dwave_service:app --host 0.0.0.0 --port 8004 > /root/dwave.log 2>&1 &


# Export Qwen Engine Configuration for the Backend
export QWEN_BASE_URL="http://127.0.0.1:8000/v1"
export QWEN_MODEL="predibase/Qwen2.5-32B-Instruct-FP8"

echo "Starting FastAPI Backend (Council of Experts Pipeline on Port 8002)..."

# Start backend on 0.0.0.0 so RunPod proxy can expose it
nohup uvicorn v2.main_v2:app --host 0.0.0.0 --port 8002 > /root/backend.log 2>&1 &

echo "All services started!"
echo "vLLM: Port 8000"
echo "D-Wave: Port 8004"
echo "AI Engine: Port 8002"
echo "View logs with: tail -f /root/vllm.log /root/dwave.log /root/backend.log"
