# Quantum Guru - System Architecture

Welcome to the comprehensive internal documentation for Quantum Guru. This document details the high-level architecture, database schemas, core domain pipelines, APIs, and external integrations to serve as a single source of truth for all current and future developers.

---

## 1. High-Level Architecture & Global Patterns

Quantum Guru is built on a modern **Next.js (App Router)** stack, combining a React frontend with Server Actions and API routes for backend execution.

### The "Thin Controller" Pattern
Historically, the application relied on a monolithic `chat.ts` file. To ensure scalability and fault tolerance, the backend has been decoupled into specialized **Pipeline Services**:
- **Orchestration**: `chat.ts` acts merely as a traffic director and token manager. It intercepts the chat request, identifies the current modes, injects shared dependencies (like `genAI` or API keys), and passes execution down to the pipelines.
- **Domain Isolation**: By keeping pipelines separate (e.g., `market-pipeline.ts` vs `industry-pipeline.ts`), a crash in the Yahoo Finance API will never break the D-Wave quantum simulator.

### Authentication & Authorization Flow
The application uses a custom JWT/Session-based authentication system managed via `AuthContext.tsx`.
- **Guest Access**: Users can browse `/market` and `/quantum-assistant` as guests. Token limits are tracked locally via `localStorage`.
- **Standard Access**: Upon signing up, users are placed in a "pending admin approval" state. Once approved, they gain server-tracked token limits and access to specialized endpoints.
- **Industry Portal**: The `/industry` and `/article-learn` routes are strictly locked. Unauthenticated users hitting these routes are intercepted by an inline `<IndustryLogin />` component. Upon success, they are redirected back to the root `/` to choose their entry point.
- **Admin Portal**: A dedicated secure login at `/admin/login` grants access to `/admin/dashboard` for managing users, prompts, and view system analytics.

---

## 2. Database Schemas (MongoDB)

All models are defined using `mongoose` in the `src/models/` directory.

### Core Models
- **`User`**: 
  - Tracks identity (`email`, `firstName`, `lastName`, `password`).
  - Access control (`role`: 'user' | 'admin', `status`: 'pending' | 'active').
  - Usage tracking (`plan`: 'Guest' | 'Pro' | 'Enterprise', `tokenLimit`, `tokensUsed`).
- **`Experiment`**: 
  - Represents a single Quantum workflow execution.
  - Fields: `userEmail`, `industry`, `service`, `problem`, `hardware`.
  - Heavy Data: `parameters` (form input), `generatedCode`, `result` (simulator output), `interpretation`.
  - Caching: `cacheKey` (SHA-256 hash of parameters) and `status`.
- **`ChatLog`** & **`QaPair`**: 
  - Records the timeline of interactions. `ChatLog` groups messages by session, while `QaPair` stores individual prompts, LLM responses, token counts, and user feedback ratings.

### Admin Configuration Models
- **`SystemPrompt`**: Allows admins to dynamically edit the instructions given to the LLM without redeploying code. Identified by `key` (e.g., `market_inquiry`, `industry_code_gen`).
- **`LLMSetting`**: Global configuration for selecting the active AI model (e.g., Gemini Flash vs. Groq Llama 3).
- **`QuantumForm`**: Dynamic JSON schemas defining the UI forms presented to users based on their Industry/Service selection.

### Data Storage Models
- **`News`**: Scraped market news articles stored with vector embeddings for context retrieval.
- **`Guardrail`**: Deterministic rule sets used to validate hardware capability limits before sending code to a quantum simulator.

---

## 3. Core Domain Pipelines

The intelligence of the application is handled by four distinct pipelines located in `src/app/actions/`.

### A. Market Pipeline (`market-pipeline.ts`)
1. **Ticker Extraction**: Uses a fast LLM call to extract the stock ticker from a natural language prompt.
2. **Data Fetching**: Queries the `yahoo-finance2` API for real-time pricing (`price`, `changePercent`, `volume`).
3. **Prompt Enrichment**: Combines the user's prompt, real-time data, and any provided News context into a compiled string using the `market_inquiry` system prompt.

### B. Article Pipeline (`article-pipeline.ts`)
1. **URL Scraping**: Injects the `scrapeUrl` utility (utilizing `cheerio`) to download and parse the DOM of a target URL.
2. **Context Assembly**: Combines the scraped HTML text with the user's question and the `article_inquiry` dynamic prompt to force the LLM to answer strictly based on the article context.

### C. Assistant Pipeline (`assistant-pipeline.ts`)
1. **General Inquiry**: The simplest pipeline. Retrieves the `assistant_mode` system prompt to guide general quantum computing questions using conversational history.

### D. Industry Pipeline (`industry-pipeline.ts`)
This is the most complex execution path, handling actual quantum simulations:
1. **Deterministic Guardrails**: Validates the user's form parameters against the `Guardrail` DB model to ensure physical hardware limits (like max qubits) aren't exceeded.
2. **SHA-256 Caching**: Hashes the input parameters. If an exact match exists in the `Experiment` DB with a 'success' status, it returns the cached result immediately, bypassing expensive LLM/Simulator compute.
3. **Template Building**: Checks if the selected hardware requires a `qiskit` (IBM) or `dwave` (Ocean) implementation and fetches the respective `industry_code_gen` prompt.
4. **Generative Loop**: 
   - Uses the LLM to generate pure Python structural code.
   - Cleans the output (stripping markdown).
   - Validates the AST (Abstract Syntax Tree equivalent) block to prevent malicious imports (`os`, `subprocess`, `sys`).
5. **Hardware Execution**: Routes the clean Python code to either `executeQuantumCircuit` (Local/Remote container for Qiskit) or `executeDWaveAnnealer` (API call via Axios to external solver).
6. **Interpretation**: Feeds the raw stochastic output back to the LLM to render a human-readable summary.
7. **Storage**: Saves the full lifecycle to the `Experiment` collection.

---

## 4. API Routes & Endpoints

Next.js Server API mapped in `src/app/api/`:

- **`/api/auth/[login/signup/me]`**: Handles credential validation, JWT minting (or local session verification), and fetching fresh token limits.
- **`/api/admin/*`**: Secured endpoints requiring `role === 'admin'`. Handles CRUD operations for users, dynamic prompts, and form mapping modifications. Includes a specialized `/api/admin/stock-debug` route to manually test market fetch logic.
- **`/api/quantum-forms/metadata`**: Returns the massive JSON tree linking Industries -> Services -> Problems -> Hardware, used to render the Central Wizard UI.

---

## 5. UI Components & Contexts

### Core Layouts
- **`AppLayout.tsx`**: The foundational shell. Manages the responsive left/right sidebars, mobile toggling, and the `TokenUsageIndicator`.
- **`AuthContext.tsx`**: A global React Context providing the `user` object, `isAuthenticated` boolean, and `login`/`logout` methods to all child components.

### Domain Interfaces
- **Chat Components**: (`MarketChat`, `IndustryChat`, `ArticleChat`, `AssistantChat`) Handle the physical scrolling, rendering of message bubbles via `MarkdownRenderer`, and managing the `useState` arrays for chat history. They are injected as `children` into `AppLayout`.
- **`CentralWizard.tsx`**: A multi-step UI overlay used exclusively in the `/industry` flow to select the target quantum hardware and problem set before unlocking the chat interface.

---

## 6. External Integrations

- **LLM Engine**: Primary intelligence is powered by `GoogleGenerativeAI` (`@google/generative-ai`) using the `gemini-2.0-flash-lite` model for fast, cheap inference, with fallback support for Groq SDK.
- **Quantum Cloud (Qiskit)**: The application connects to a containerized `qiskit-service` (usually deployed on Railway/Render) via `axios` at `process.env.QISKIT_SERVICE_URL`. This remote server actually executes the Python code.
- **Quantum Cloud (D-Wave)**: Connects to a D-Wave API/solver endpoint at `process.env.DWAVE_SERVICE_URL`.
- **Financial Data**: Relies on the NPM package `yahoo-finance2` for real-time stock quotes.

---

## 7. App Context & Local Storage

- **AuthContext**: React context at `src/context/AuthContext.tsx`. Persists the `user` object to `localStorage` under the key `quantum_session`, preventing users from logging out entirely on refresh. Updates in real-time alongside token fetches.
- **Routing Security**: Components conditionally check `useAuth().isAuthenticated` to either render `IndustryLogin.tsx` components or allow access.