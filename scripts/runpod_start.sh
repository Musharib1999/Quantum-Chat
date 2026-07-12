#!/bin/bash
export HF_HOME=/workspace/huggingface_cache

echo "Starting vLLM Inference Engine from local directory..."
nohup vllm serve /workspace/Qwen-32B-FP8   --dtype auto   --max-model-len 8192   --gpu-memory-utilization 0.90   --tensor-parallel-size 1   --port 8000 > /root/vllm.log 2>&1 &

echo "Waiting for vLLM to initialize (checking port 8000)..."
while ! curl -s http://localhost:8000/v1/models > /dev/null; do
    sleep 5
    echo -n "."
done
echo "vLLM is ONLINE!"

cd quantum-backend || exit
pip install -r requirements_runpod.txt

echo "Starting D-Wave Simulator Service (Port 8004)..."
nohup uvicorn dwave_service:app --host 0.0.0.0 --port 8004 > /root/dwave.log 2>&1 &

export QWEN_BASE_URL="http://127.0.0.1:8000/v1"
export QWEN_MODEL="/workspace/Qwen-32B-FP8"

echo "Starting FastAPI Backend (Council of Experts Pipeline on Port 8002)..."
nohup uvicorn v2.main_v2:app --host 0.0.0.0 --port 8002 > /root/backend.log 2>&1 &

echo "All services started!"
