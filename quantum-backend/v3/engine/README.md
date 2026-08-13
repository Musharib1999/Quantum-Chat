# OptiOS Quantum AI Engine Specification (Entity 1)

The **OptiOS Quantum AI Engine** is the core computational microservice of the platform. It encapsulates the LLM agent pipelines, semantic vector retrieval database, compilation logic, and the isolated code execution sandbox. 

---

## 1. Engine Roles & Responsibilities

* **Multi-Agent Pipeline Orchestration:** Coordinated by the `SupervisorAgent`, executes the sequential agent loop (`Understanding` ➔ `Feasibility` ➔ `Routing` ➔ `Code Generation` ➔ `Verification` ➔ `Repair`).
* **Semantic RAG Retrieval:** Loads a local FAISS index (`knowledge_index.faiss`) and the `all-MiniLM-L6-v2` SentenceTransformer model to retrieve mathematically equivalent model formulations.
* **AST Solver Compilations:** Translates mathematical abstractions into solver code for OR-Tools (MILP), AutoQUBO, or D-Wave QPUs.
* **Sandbox Verification:** Spawns a sandboxed subprocess verifier to dry-run compiled scripts, validating variables and constraints against the original specification.

---

## 2. API Endpoint Mapping

The engine is designed to run behind a gateway proxy on an internal port (default `8003`).

| Engine Endpoint | Method | Payload | Function Handled |
| :--- | :--- | :--- | :--- |
| `/engine/run` | `POST` | `PipelineRequest` | Executes the sequential agent chain synchronously. |
| `/engine/stream` | `POST` | `PipelineRequest` | Yields SSE events updating compilation steps. |
| `/engine/assistant/chat` | `POST` | `AssistantChatRequest` | Direct similarity match in the FAISS RAG database. |
| `/engine/enterprise/analyze` | `POST` | `PipelineRequest` | Runs NLP parser and feasibility agents. |
| `/engine/v3/finalize` | `POST` | `FinalizeRequest` | Summarizes simulator outputs in plain English. |
| `/engine/v2/execute` | `POST` | `ExecutionRequest` | Runs code in the sandboxed verifier. |

---

## 3. Configuration & Deployment

### Environment Variables (.env)
```bash
ENGINE_PORT=8003
WORKERS=1 # Keep at 1 for async event loop optimization
QWEN_BASE_URL="https://your-runpod-qwen-endpoint/v1"
LLAMA_BASE_URL="https://your-runpod-llama-endpoint/v1"
```

### Installation Dependencies
Requires GPU-compatible environment wrappers and deep learning packages:
```
fastapi
uvicorn
pydantic
python-multipart
httpx
numpy
faiss-cpu
sentence-transformers
dimod
dwave-neal
ortools
qiskit
qiskit-optimization
qiskit-aer
dwave-system
```

### Run Commands
* **Development:**
  ```bash
  python3 app.py
  ```
* **Production:**
  ```bash
  ./start.sh
  ```

---

## 4. Dockerized Container Deployment (RunPod)

To bypass python dependency compilation delays and avoid PyTorch/CUDA driver mismatches, deploy using the pre-configured `Dockerfile`:

### Step A: Build & Push the Image
On your build machine or local computer, run:
```bash
# 1. Build the Docker container image
docker build -t your-username/optios-ai-engine:latest .

# 2. Push the image to Docker Hub (or GitHub Registry)
docker push your-username/optios-ai-engine:latest
```

### Step B: Configure RunPod Template
1. Create a **Pod Template** in RunPod.
2. Set the **Container Image** to: `your-username/optios-ai-engine:latest`.
3. Set the **Exposed Port** to `8003`.
4. Define the following **Environment Variables**:
   * `FAISS_INDEX_URL`: Public S3 direct link to download the 61MB `knowledge_index.faiss` file on startup.
   * `FAISS_METADATA_URL`: Public S3 direct link to download the `knowledge_metadata.json` metadata database.
   * `MONGODB_URI`: MongoDB connection string.
   * `QWEN_BASE_URL` & `LLAMA_BASE_URL`: RunPod vLLM endpoints.
   * `QWEN_API_KEY` & `LLAMA_API_KEY`: API keys.
5. Click **Deploy**. The pod will pull the compiled image, download the 61MB index file, and start running in less than 30 seconds.
