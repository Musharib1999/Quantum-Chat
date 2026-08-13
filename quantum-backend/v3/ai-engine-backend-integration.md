# AI Engine to API Gateway Integration Specification

This document details the interface, network protocols, and data contracts between **Entity 1 (Quantum AI Engine - Port 8003)** and **Entity 2 (API Gateway Backend - Port 8002)**.

---

## 1. Architectural Relationship

The AI Engine acts as a headless compute node running within an isolated internal subnet. The API Gateway serves as the public entry point, proxying client traffic to the AI Engine.

```
┌──────────────────────────────────────┐                   HTTP / SSE
│     API Gateway Backend (Port 8002)  │ ──────────────────────────────────────┐
└──────────────────────────────────────┘                                       │
                                                                               ▼
                                                            ┌──────────────────────────────────────┐
                                                            │    Quantum AI Engine (Port 8003)     │
                                                            └──────────────────────────────────────┘
```

---

## 2. API Contract & Internal Routes

All requests are validated by Pydantic schemas in the Gateway and routed to internal `/engine/...` endpoints:

### A. Non-Streaming Optimization Pipeline
* **Gateway Endpoint:** `POST /v3/pipeline`
* **Internal Proxy Route:** `POST http://localhost:8003/engine/run`
* **Protocol:** HTTP POST (JSON)
* **Payload:** `CodeGenRequest`
* **Timeout Limit:** 180 seconds

### B. Streaming Optimization Pipeline (SSE)
* **Gateway Endpoint:** `POST /v3/enterprise/pipeline/stream`
* **Internal Proxy Route:** `POST http://localhost:8003/engine/stream`
* **Protocol:** HTTP GET/POST (text/event-stream)
* **Payload:** `PipelineRequest`
* **Timeout Limit:** 300 seconds

### C. RAG Database Queries
* **Gateway Endpoint:** `POST /assistant/chat`
* **Internal Proxy Route:** `POST http://localhost:8003/engine/assistant/chat`
* **Protocol:** HTTP POST (JSON)
* **Payload:** `AssistantChatRequest`
* **Timeout Limit:** 30 seconds

### D. Mathematical Code Sandbox Execution
* **Gateway Endpoint:** `POST /v2/execute`
* **Internal Proxy Route:** `POST http://localhost:8003/engine/v2/execute`
* **Protocol:** HTTP POST (JSON)
* **Payload:** `ExecutionRequest`
* **Timeout Limit:** 90 seconds

---

## 3. Communication Implementation

The Gateway uses `httpx.AsyncClient` to maintain connection pools and stream responses chunk-by-chunk:

```python
async with httpx.AsyncClient(timeout=300.0) as client:
    async with client.stream("POST", f"{ENGINE_URL}/engine/stream", json=payload) as response:
        async for line in response.aiter_lines():
            yield line
```

---

## 4. Shared State & Logging

* **Environment Sync:** Both services read from the same `.env` using identical `config.py` logic, ensuring shared database connections (`MONGODB_URI`) and model endpoints (`QWEN_BASE_URL`).
* **Workflow Audit Logs:** As the AI Engine executes steps sequentially, it directly writes progress to MongoDB. The API Gateway reads this logged data when users query history or audit logs.
