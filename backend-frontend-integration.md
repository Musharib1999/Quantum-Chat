# Frontend-to-Backend Integration Specification

This document details the communication protocols, API endpoints, data flow, and network topologies linking the **Next.js Frontend** to the **OptiOS API Gateway (Entity 2)**.

---

## 1. Network Topology & Environment Configuration

The system uses a tiered architecture. The browser client interacts with the Next.js Server, the Next.js Server acts as a caching controller/proxy to the API Gateway, and the Gateway redirects compute tasks to the internal Quantum AI Engine:

```
┌──────────────────┐               HTTP / SSE              ┌─────────────────────┐
│  Client Browser  │ ────────────────────────────────────> │  Next.js Server     │
└──────────────────┘                                       │  (localhost:3000)   │
                                                           └──────────┬──────────┘
                                                                      │
                                                                      │ HTTP / Proxy calls
                                                                      ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        OptiOS API Gateway (Entity 2 - localhost:8002)                  │
└─────────────────────────────────────────┬──────────────────────────────────────────────┘
                                          │
                                          │ Internal HTTP/SSE proxy (port 8003)
                                          ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        OptiOS Quantum AI Engine (Entity 1 - localhost:8003)            │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### Frontend Environment Variable
The frontend needs to know where the API Gateway is running:
* **File:** `.env.local` (or server environment settings)
* **Variable:** `NEXT_PUBLIC_BACKEND_URL` (Defaults to `http://127.0.0.1:8002`)

---

## 2. Integration Integration Pathways

### Flow 1: Real-Time SSE Pipeline Streaming (Highly Optimized)
Used to show compiling progress steps on the user dashboard.

1. **Trigger:** User submits an optimization problem formulation in the UI.
2. **First Hop (Client to Next.js API):** Browser initiates a `POST` request to `src/app/api/chat/stream/route.ts` with the body:
   ```json
   {
     "unstructured_problem": "Minimize costs of 5 driver shifts...",
     "mode": "auto",
     "session_id": "session_123456"
   }
   ```
3. **Second Hop (Next.js to API Gateway):** Next.js fetches the API Gateway streaming endpoint:
   `${NEXT_PUBLIC_BACKEND_URL}/v3/enterprise/pipeline/stream`
4. **Third Hop (Gateway to AI Engine):** The Gateway (`api/main_v3.py`) validates the semaphore slot and proxies the payload to the AI Engine at:
   `http://localhost:8003/engine/stream`
5. **Response Streaming:** The engine streams progress updates back through the pipeline, which are parsed chunk-by-chunk by `useQuantumChat.ts` to update the React state.

---

### Flow 2: General Q&A / Pipeline Finalize (Server Actions)
Exposed in `src/app/actions/chat.ts`.

1. **Trigger:** User asks a general quantum computing query (e.g. "What is VQE?") or the simulator returns results that need final interpretation.
2. **Cache Check:** The Server Action computes a SHA-256 hash of the prompt and checks MongoDB collection `solvedproblems` or does keyword-overlap semantic analysis.
3. **Cache Miss Routing:** If the cache misses:
   * **For Finalize:** Calls `POST ${NEXT_PUBLIC_BACKEND_URL}/v3/finalize`.
   * **For General Q&A:** Calls `POST ${NEXT_PUBLIC_BACKEND_URL}/v2/chat`.
4. **Result Storage:** The result is saved back to MongoDB to ensure subsequent identical runs hit the cache instantly (<100ms).

---

### Flow 3: Code Sandbox Execution (Browser to Solver)
1. **Trigger:** User runs the compiled Python code in the interactive Monaco editor.
2. **Execution Request:** Next.js sends a JSON payload containing the script to the API Gateway:
   `POST ${NEXT_PUBLIC_BACKEND_URL}/v2/execute`
3. **Proxy Execution:** The Gateway proxies this request to `/engine/v2/execute`. The engine runs the code inside an isolated sandboxed verifier, returning stdout and stderr.
4. **Response:**
   ```json
   {
     "output": "Execution stdout logs...",
     "error": null,
     "success": true
   }
   ```

---

## 3. Gateway Failover & Timeouts

* **Timeout Configuration:** Next.js uses standard timeouts, but backend proxy calls utilize `httpx` timeouts capped at:
  * **General QA:** 30 seconds
  * **Optimization Pipeline:** 180 seconds (3 minutes)
  * **Sandbox Code Execution:** 90 seconds
* **Connection Reconnects:** SSE streams handle automatic retry intervals on network disruption via the standard EventSource protocol.
