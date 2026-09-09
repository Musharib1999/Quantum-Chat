# RunPod A40 Setup Guide (vLLM + FastAPI + D-Wave)

This guide documents the exact environment setup required to run the Quantum Guru pipeline with Qwen 2.5 32B FP8 on a RunPod A40 instance. It intentionally bypasses all known dependency conflicts (vLLM rope_scaling bugs, torchcodec CUDA 13 crashes, and triton cache incompatibilities).

## 1. Initial Setup & Cloning
```bash
cd /workspace
git clone https://<GITHUB_TOKEN>@github.com/msfga1996-source/Quantum_Guru.git
cd Quantum_Guru
```

## 2. Environment Wipe (Clean Slate)
Wipe the default conflicting packages pre-installed on standard RunPod images that cause crashes:
```bash
pkill -9 -f "python"
pip uninstall -y vllm triton torch torchvision torchaudio xformers torchcodec
```

## 3. Strict Dependency Installation
Install the exact version matrix required to support Qwen 2.5 without breaking CUDA 12.1 or triggering the tokenizer API changes.

```bash
# Force install stable transformers/tokenizers to avoid the 'all_special_tokens_extended' bug
pip install transformers==4.46.3 tokenizers==0.20.3

# Cleanly install vLLM 0.6.6 (has native Qwen 2.5 support), forcing it to pull the perfect torch/triton combo for CUDA 12.1
pip install vllm==0.6.6.post1 --extra-index-url https://download.pytorch.org/whl/cu121 --no-cache-dir

# Install Optimization & Backend Libraries 
# (Downgrade specific dwave/ortools packages to explicitly support Numpy 1.x which vLLM strictly requires)
pip install faiss-cpu sentence-transformers requests httpx
pip install dwave-ocean-sdk==7.0.0 ortools==9.10.4067 scipy==1.13.1
```

## 4. Download the Model
Use the blazing fast `hf` tool to securely download the FP8 Qwen model to the local workspace disk:
```bash
echo "Downloading Qwen 32B FP8 Model..."
hf download predibase/Qwen2.5-32B-Instruct-FP8 --local-dir /workspace/Qwen-32B-FP8
```

## 5. Start the Services
Run the automated startup script which sequentially launches:
1. vLLM Engine (Port 8000)
2. D-Wave Simulator (Port 8004)
3. FastAPI Backend (Port 8002)

```bash
cd /workspace/Quantum_Guru
chmod +x scripts/runpod_start.sh
./scripts/runpod_start.sh
```

## Monitoring
Open separate terminal tabs and run:
- **vLLM Engine**: `tail -f /root/vllm.log`
- **FastAPI Backend**: `tail -f /root/backend.log`
- **D-Wave Simulator**: `tail -f /root/dwave.log`
