# AI Engine to Frontend Integration Specification

This document details the logical integration and data flows connecting the **Next.js Frontend** to the **OptiOS Quantum AI Engine (Entity 1)**. 

---

## 1. Network Boundary & Security Isolation

For security and resource protection, the frontend **never** connects directly to the Quantum AI Engine. The AI Engine runs on an internal port (`8003`) that is firewalled from public internet access. All data flows are marshaled through the **API Gateway Backend (Entity 2 - Port 8002)**.

```
┌──────────────────┐               HTTP / SSE              ┌─────────────────────┐
│  Client Browser  │ ────────────────────────────────────> │  Next.js Server     │
└──────────────────┘                                       │  (localhost:3000)   │
                                                           └──────────┬──────────┘
                                                                      │
                                                                      │ HTTP / Proxy calls
                                                                      ▼
                                                           ┌─────────────────────┐
                                                           │  API Gateway (8002) │
                                                           └──────────┬──────────┘
                                                                      │
                                                                      │ Internal Network
                                                                      ▼
                                                           ┌─────────────────────┐
                                                           │   AI Engine (8003)  │
                                                           └─────────────────────┘
```

---

## 2. End-to-End Integration Flows

### Flow A: Multi-Agent SSE Streaming

1. **Submission:** The user enters an unstructured business problem and clicks "Compile".
2. **First Hop (Client to Next.js API):** Browser initiates a `POST` request to Next.js server route: `/api/chat/stream`.
3. **Second Hop (Next.js to API Gateway):** The Next.js API proxies the payload to the API Gateway `/v3/enterprise/pipeline/stream` endpoint.
4. **Third Hop (Gateway to AI Engine):** The Gateway verifies the semaphore limits and streams the request to the AI Engine `/engine/stream`.
5. **SSE Stream Processing:** 
   * The AI Engine runs the agents, publishing step updates (`nlp_parser`, `feasibility`, `routing`, etc.) as JSON objects.
   * `useQuantumChat.ts` on the browser listens to this stream, translating events to update the progress stepper in real-time.

---

### Flow B: General Q&A Retrieval (RAG)

1. **Question:** User inputs a general quantum topic query in the chat sidebar.
2. **Server Action Route:** The Next.js Server Action (`src/app/actions/chat.ts`) handles the call.
3. **Cache Validation:** Next.js computes a SHA-256 hash of the query:
   * **Hit:** If a match is found in the MongoDB cache, Next.js returns the answer immediately in `< 100ms`, never calling the AI Engine.
   * **Miss:** Next.js posts the query to the API Gateway `/assistant/chat`.
4. **Gateway-to-Engine Query:** The API Gateway proxies the query to `/engine/assistant/chat`. The AI Engine runs the FAISS vector database lookup and returns RAG hits back through the gateway.

---

### Flow C: Solver Code Verification

1. **Run Code:** The user edits a compiled mathematical script and clicks "Run Solver".
2. **Execution Request:** Next.js posts the raw code payload to the API Gateway `/v2/execute`.
3. **Gateway-to-Engine Run:** The Gateway routes the code to the AI Engine `/engine/v2/execute`. 
4. **Subprocess Verification:** The AI Engine writes the code to a temporary file, executes it in a sandboxed subprocess verifier, and returns the standard output (`stdout`) and compilation status.
