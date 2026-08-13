# OptiOS API Gateway Specification (Entity 2)

The **OptiOS API Gateway** serves as the public-facing entry point for client integrations and the Next.js web application. It handles requests, logs transactions to MongoDB, manages CORS boundaries, and proxies heavy computational workflows to the backend **Quantum AI Engine**.

---

## 1. Gateway Roles & Responsibilities

* **Request Ingress:** Accepts and validates client payloads using Pydantic models.
* **CORS Lockdown:** Limits incoming requests to whitelisted origins (`localhost:3000`, `localhost:3001`, `optios.vercel.app`), expandable via the `ALLOWED_ORIGINS` environment variable.
* **Concurrency Guard:** Employs a global Semaphore (`MAX_PIPELINE_SLOTS`) to limit active optimization tasks to protect downstream vLLM GPU resources.
* **Zero-ML Footprint:** Completely decoupled from heavy ML packages (PyTorch, SentenceTransformers, FAISS) to ensure lightning-fast startup and minimal RAM footprint.
* **Proxy Routing:** Forwards all AI pipeline, chat RAG, and execution checks to the internal AI Engine using `httpx`.

---

## 2. API Endpoint Mapping

| Gateway Endpoint | Method | Payload Model | Proxy Target | Description |
| :--- | :--- | :--- | :--- | :--- |
| `/v3/pipeline` | `POST` | `CodeGenRequest` | `/engine/run` | Main code compiler interface. |
| `/v3/enterprise/pipeline/stream` | `POST` | `PipelineRequest` | `/engine/stream` | Streams step events via SSE. |
| `/assistant/chat` | `POST` | `AssistantChatRequest` | `/engine/assistant/chat` | Queries local FAISS RAG index. |
| `/enterprise/analyze` | `POST` | `AnalyzeRequest` | `/engine/enterprise/analyze` | Verifies math parameter feasibility. |
| `/v3/finalize` | `POST` | `FinalizeRequest` | `/engine/v3/finalize` | Translates raw metrics into insights. |
| `/v2/execute` | `POST` | `ExecutionRequest` | `/engine/v2/execute` | Executes Python code in sandbox verifier. |

---

## 3. Configuration & Deployment

### Environment Variables (.env)
```bash
PORT=8002
UVICORN_WORKERS=4
MAX_PIPELINE_SLOTS=8
QUANTUM_ENGINE_URL="http://localhost:8003"
ALLOWED_ORIGINS="https://yourdomain.com"
```

### Installation Dependencies
```
fastapi
uvicorn
pydantic
python-multipart
httpx
pymongo
motor
bcrypt
python-dotenv
```

### Run Commands
* **Development (Single worker):**
  ```bash
  python3 main_v3.py --workers 1
  ```
* **Production (Gunicorn Multi-worker):**
  ```bash
  ./start.sh
  ```
