# Graph Report - prime-blazar  (2026-08-20)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1473 nodes · 2633 edges · 164 communities (100 shown, 64 thin omitted)
- Extraction: 89% EXTRACTED · 11% INFERRED · 0% AMBIGUOUS · INFERRED: 298 edges (avg confidence: 0.89)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5fc1eb3d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- expander.py
- Constraint
- admin.ts
- useAuth
- .compile_ir
- extract_numeric_blocks
- dbConnect
- ir.py
- quantum-assistant/page.tsx
- main_v3.py
- devDependencies
- registry.py
- compilerOptions
- call_primary
- app.py
- numeric_extractor.py
- inject_numeric_blocks
- direct_model_pipeline.py
- OptimizationIR
- auth.ts
- dcc.py
- .execute
- chat.ts
- compile_v66
- _flatten
- test_numeric_extractor.py
- engine_enterprise_analyze
- Workspace
- ConstraintTemplate
- TestSkipCases
- multi_agent.py
- stress_test_numeric_extractor.py
- TestEdgeCasesAtScale
- check_token_budget
- QuantumForm.ts
- User.ts
- DWaveAdapter
- main.py
- _is_all_numeric
- TestLosslessnessAtScale
- TestPerformance
- qubo_backend.py
- ObjectiveNode
- log_engagement
- deploy
- dependencies
- _find_balanced_bracket
- TestMultipleBlocks
- seed_articles.js
- prompts/route.ts
- BudgetTemplate
- CapacityTemplate
- CardinalityTemplate
- CoverageTemplate
- DependencyTemplate
- MutualExclusionTemplate
- ObjectiveTemplate
- SupervisorAgent
- _is_range_like
- execute/route.ts
- dotenv
- TestRealisticProblems
- users/route.ts
- constraint_templates.py
- SandboxedVerifier
- VectorRetriever
- eslint.config.mjs
- runpod_start.sh
- system-logs/route.ts
- QuantumFormFetcher.tsx
- vercel.json
- get_full_log2.js
- .expand
- admin/login/page.tsx
- middleware.ts
- check_prompt.js
- debug_python_path.js
- get_full_log.js
- get_logs.js
- ingest_portfolio.js
- interpreter.py
- knowledge.py
- nlp_parser.py
- pattern_classifier.py
- selection_parser.py
- check_duplicates.js
- update_symbols.js
- status/route.ts
- ModeSwitcher.tsx
- Article.ts
- BlockedSource.ts
- LLMSetting.ts
- UseCase.ts
- update_finance_template.js
- bcryptjs
- axios
- clsx
- framer-motion
- html2canvas
- inspect_logo.js
- jspdf
- lucide-react
- @monaco-editor/react
- mongoose
- next
- next.config.ts
- next-env.d.ts
- plotly.js
- react
- react-markdown
- react-plotly.js
- react-syntax-highlighter
- recharts
- remark-gfm
- tailwind-merge
- @types/react-syntax-highlighter
- zod
- zustand
- postcss.config.mjs
- build.sh
- api/start.sh
- health
- engine/start.sh
- restart_all.sh
- test_hydration.js

## God Nodes (most connected - your core abstractions)
1. `extract_numeric_blocks()` - 101 edges
2. `dbConnect()` - 86 edges
3. `parse_spec_to_cmm()` - 44 edges
4. `Constraint` - 36 edges
5. `Variable` - 32 edges
6. `CompilerPlanner` - 28 edges
7. `OptimizationIR` - 27 edges
8. `expand_cmm_to_om()` - 25 edges
9. `Equation` - 20 edges
10. `useAuth()` - 20 edges

## Surprising Connections (you probably didn't know these)
- `run_local_pipeline()` --uses--> `DWaveAdapter`  [INFERRED]
  test_local_pipeline.py → quantum-backend/v3/engine/compiler/backends/autoqubo_backend.py
- `run_local_pipeline()` --calls--> `compile_om_to_autoqubo()`  [INFERRED]
  test_local_pipeline.py → quantum-backend/v3/engine/compiler/backends/autoqubo_backend.py
- `run_local_pipeline()` --calls--> `expand_cmm_to_om()`  [INFERRED]
  test_local_pipeline.py → quantum-backend/v3/engine/compiler/expander.py
- `run_local_pipeline()` --calls--> `parse_spec_to_cmm()`  [INFERRED]
  test_local_pipeline.py → quantum-backend/v3/engine/compiler/expander.py
- `inspectPrompts()` --calls--> `dbConnect()`  [EXTRACTED]
  inspect_prompts.ts → src/lib/db.ts

## Import Cycles
- None detected.

## Communities (164 total, 64 thin omitted)

### Community 0 - "expander.py"
Cohesion: 0.11
Nodes (60): AvailabilityPattern, BinaryOp, CanonicalMathematicalModel, CapacityPattern, CMMConstraint, CMMConstraintPattern, CMMFunction, CMMObjective (+52 more)

### Community 1 - "Constraint"
Cohesion: 0.08
Nodes (25): BalancePrimitive, BudgetPrimitive, CapacityPrimitive, CardinalityPrimitive, CompilerPlanner, CoveragePrimitive, EqualityPrimitive, Equation (+17 more)

### Community 2 - "admin.ts"
Cohesion: 0.06
Nodes (41): addGuardrail(), addHardware(), addQaPair(), ChatLogType, deleteGuardrail(), deleteHardware(), deleteQaPair(), getChatLogs() (+33 more)

### Community 3 - "useAuth"
Cohesion: 0.05
Nodes (36): AIResponse, metadata, montserrat, viewport, LoginForm(), FeatureCardProps, LandingPage(), HardwareItem (+28 more)

### Community 4 - ".compile_ir"
Cohesion: 0.08
Nodes (24): GateCompiler, Any, Builds a Canonical Circuit IR from the input spec. Canonical schema: -…, Calculates and verifies the Intent Coverage Score. If coverage < 1.0 (100%),…, Structural Validation and Per-Qubit State Machine Tracking. States: ALLOCATED…, Phase 5 — Circuit Metrics (Expanded), Smarter algorithm recognition with partial matching., Compiles a manifest of the parsed circuit IR. (+16 more)

### Community 5 - "extract_numeric_blocks"
Cohesion: 0.08
Nodes (10): extract_numeric_blocks(), Extract all large numeric blobs from `text` and replace with NUMBLK_xxx IDs.…, 2D list: the outer block should be extracted as one unit, not inner 1D lists…, TestExtract1DList, TestExtract2DMatrix, TestExtract3DTensor, TestExtractNumpyNotation, TestExtractSpaceTable (+2 more)

### Community 6 - "dbConnect"
Cohesion: 0.09
Nodes (27): inspectPrompts(), POST(), POST(), DELETE(), GET(), POST(), PUT(), DELETE() (+19 more)

### Community 7 - "ir.py"
Cohesion: 0.09
Nodes (21): Enum, Validates that all IR variables appear in the compiled equations or objectives.…, SemanticBindingValidator, Aggregate, Aggregate2D, BinaryOp, ConstraintType, Domain (+13 more)

### Community 8 - "quantum-assistant/page.tsx"
Cohesion: 0.11
Nodes (25): getAlgorithmCode(), createChatSession(), deleteChatSession(), getChatSessions(), updateChatSession(), getChatHistory(), saveMessages(), App() (+17 more)

### Community 9 - "main_v3.py"
Cohesion: 0.15
Nodes (34): BackgroundTasks, AnalyzeRequest, AnalyzeResponse, assistant_chat(), AssistantChatRequest, ChatRequest, CodeGenRequest, CodeGenResponse (+26 more)

### Community 10 - "devDependencies"
Cohesion: 0.06
Nodes (33): dotenv-cli, eslint, eslint-config-next, devDependencies, dotenv-cli, eslint, eslint-config-next, tailwindcss (+25 more)

### Community 11 - "registry.py"
Cohesion: 0.07
Nodes (24): Any, algorithms.py — Phase 5 & Phase 6 templates for the Quantum Algorithm Library., verify_deutsch_jozsa(), verify_grover(), Any, arithmetic.py — Phase 8 templates for the Quantum Algorithm Library., verify_half_adder(), Any (+16 more)

### Community 12 - "compilerOptions"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 13 - "call_primary"
Cohesion: 0.12
Nodes (22): QuantumGuru Engine v3 — Central Configuration Loads from OptiOS/.env…, call_groq(), groq_client.py — Groq Inference Client Quantum Guru Engine v3 Sends requests to…, Remove <think>...</think> blocks emitted by Qwen3 on Groq if any leak through., Call Groq completions API with OpenAI-compatible payload. Args: system: System…, _strip_think_tags(), call_adapter(), _call_vllm_lora() (+14 more)

### Community 14 - "app.py"
Cohesion: 0.14
Nodes (26): AssistantChatRequest, ChatRequest, DirectModelRequest, engine_assistant_chat(), engine_direct_model_stream(), engine_execute_code(), engine_gate_model_stream(), engine_run() (+18 more)

### Community 15 - "numeric_extractor.py"
Cohesion: 0.16
Nodes (13): _build_hint(), _build_replacement(), _extract_inline_csv(), _extract_space_tables(), _extract_vertical_lists(), ExtractionResult, _infer_dtype(), _infer_shape() (+5 more)

### Community 16 - "inject_numeric_blocks"
Cohesion: 0.14
Nodes (14): inject_numeric_blocks(), Any, numeric_injector.py — Phase 2: Numeric Injection System Quantum Guru Engine v3…, Recursively walk the CMM structure and replace block IDs with actual data.…, Inject original numeric data back into the CMM structure using registry. Args:…, _recursive_inject(), make_entry(), test_numeric_injector.py — Unit Tests for numeric_injector.py Run with: pytest… (+6 more)

### Community 17 - "direct_model_pipeline.py"
Cohesion: 0.14
Nodes (17): compile_om_to_autoqubo_ir(), parse_linear_expression(), QuboIR, Parses a linear constraint string and extracts variable coefficients (sparse —…, Compile OptimizationModel to QuboIR intermediate representation., Run frontend validation checks on the OptimizationModel before compiling., validate_optimization_model(), VariableMap (+9 more)

### Community 18 - "OptimizationIR"
Cohesion: 0.14
Nodes (12): ASTCompiler, CompilerVerificationEngine, ConflictPrimitive, Recursively extract {coeff, var_id, indices} terms from expression tree., Compiles Constraint.lhs and Constraint.rhs directly into Equation objects by…, Render RHS as a string expression for code emission., Check if the constraint has sufficient AST data for direct compilation., Compile a single constraint into Equation objects from its AST. (+4 more)

### Community 19 - "auth.ts"
Cohesion: 0.14
Nodes (14): POST(), dynamic, POST(), dynamic, POST(), dynamic, POST(), dynamic (+6 more)

### Community 20 - "dcc.py"
Cohesion: 0.15
Nodes (18): compile_om_to_autoqubo(), generate_autoqubo_code(), Convert an OptimizationModel to QUBO using Fujitsu\'s autoqubo package. Keeps…, Fallback generator if autoqubo package is not installed., compile_om_to_milp_code(), compile_om_to_milp_result(), Any, Return Python source code (as a string) that, when executed, builds a PuLP MILP… (+10 more)

### Community 21 - ".execute"
Cohesion: 0.17
Nodes (9): check_self_consistency(), Verifies that the compiled OptimizationModel variables and constraint types…, Agent, ConstraintVerificationAgent, ExplanationAgent, ModelingAgent, RepairAgent, SolverStrategyAgent (+1 more)

### Community 22 - "chat.ts"
Cohesion: 0.16
Nodes (14): ArticlePipelineDeps, buildArticleContext(), AssistantPipelineDeps, buildAssistantContext(), chatWithQuantumAI(), checkGuardrails(), getActiveGuardrails(), getPromptHash() (+6 more)

### Community 23 - "compile_v66"
Cohesion: 0.15
Nodes (10): Expr, compile_v66(), CPSatTranslatorPlugin, CQMTranslatorPlugin, Main V6.7 compilation entrypoint. Uses AST-driven compilation with semantic…, NumericalFeasibilityChecker, Validates constraint bounds against variable domains before compilation.…, Returns (min_possible, max_possible) for an expression. (+2 more)

### Community 24 - "_flatten"
Cohesion: 0.14
Nodes (8): _flatten(), 1D list with 1000 integers — extraction and losslessness., 2D matrix with 10,000 values — canonical stress test., Float matrix — dtype detection at scale., 3D tensor at moderate scale., Very large 1D list — performance check., TestLargeArrays, TestFlatten

### Community 25 - "test_numeric_extractor.py"
Cohesion: 0.14
Nodes (6): _strip_numpy_wrappers(), test_numeric_extractor.py — Unit Tests for numeric_extractor.py Run with:…, TestExtractInlineCSV, TestExtractScientificNotation, TestExtractVerticalLists, TestStripNumpyWrappers

### Community 26 - "engine_enterprise_analyze"
Cohesion: 0.17
Nodes (13): engine_enterprise_analyze(), Extract math parameters and verify mathematical feasibility (Steps 2 and 3)., _extract_json(), parse_and_validate(), JSON Schema Validator — QuantumGuru Engine v3 Validates Qwen outputs for Steps…, Remove <think>...</think> blocks emitted by Qwen3 thinking mode., Try to extract JSON from text, even if wrapped in markdown, prose, or <think>…, Returns list of missing/invalid fields. Empty list = valid. (+5 more)

### Community 27 - "Workspace"
Cohesion: 0.19
Nodes (5): Async version of verify(). Runs the sandboxed subprocess without blocking the…, AgentResult, ExecutionAgent, Any, Workspace

### Community 28 - "ConstraintTemplate"
Cohesion: 0.14
Nodes (8): ConstraintTemplate, Abstract base for all constraint templates., Canonical family name, e.g. 'budget', 'coverage'., Return Python code lines for a dimod CQM., Return Python code lines for OR-Tools CP-SAT., Return LaTeX math string., Return a Python function body string for AutoQUBO consumption., Return Python code lines for PuLP MILP.

### Community 29 - "TestSkipCases"
Cohesion: 0.14
Nodes (5): Lists with <= MIN_ELEMENTS elements should NOT be extracted., Lists with exactly MIN_ELEMENTS+1 elements SHOULD be extracted., [0, 100] should NOT be extracted — it's a range/bound., 7 inline numbers should NOT trigger inline CSV extraction., TestSkipCases

### Community 30 - "multi_agent.py"
Cohesion: 0.18
Nodes (6): audit_cqm_code(), audit_ortools_code(), CodeGenerationAgent, Bit2Qubit Multi-Agent Orchestration Architecture (V7) Enforces: LLMs decide,…, V6 Compositional Parser System Prompt — Qwen3.6 27B (Groq) Extracts…, Math Logic Reasoner System Prompt — Qwen 3 32B Step 3 of QuantumGuru v2…

### Community 31 - "stress_test_numeric_extractor.py"
Cohesion: 0.21
Nodes (8): stress_test_numeric_extractor.py — Stress & Performance Tests Run with: pytest…, Token count should drop by at least 70% for a 100-element list., 100×100 matrix should achieve 90%+ token reduction., Full realistic problem: 20 aircraft × 50 flights., 50 separate 1D arrays — cumulative token reduction., Rough token estimate: 1 token ≈ 3.5 chars., TestTokenReduction, token_estimate()

### Community 32 - "TestEdgeCasesAtScale"
Cohesion: 0.15
Nodes (7): Mix of large (extracted) and small (kept inline) arrays in one text., 3D tensor with real data — all values preserved., Long NL text with one small array — nothing extracted, text unchanged., Matrix of all zeros — no false extraction or dtype confusion., Very large integers preserved exactly., Block IDs should always be sequential: NUMBLK_000, NUMBLK_001, ..., TestEdgeCasesAtScale

### Community 33 - "check_token_budget"
Cohesion: 0.21
Nodes (7): test_token_guard.py — Unit Tests for token_guard.py Run with: pytest…, TestTokenGuard, check_token_budget(), estimate_tokens(), token_guard.py — Phase 3: Token Guard Quantum Guru Engine v3 / preprocessing…, Rough estimate of token count: 1 token ≈ 3.5 characters. This is standard and…, Check if estimated token count exceeds max_tokens. If it does, raises…

### Community 34 - "QuantumForm.ts"
Cohesion: 0.15
Nodes (10): DELETE(), dynamic, PATCH(), dynamic, GET(), IQuantumField, IQuantumForm, OutputMappingSchema (+2 more)

### Community 35 - "User.ts"
Cohesion: 0.20
Nodes (5): check(), dbConnect, mongoose, User, UserSchema

### Community 36 - "DWaveAdapter"
Cohesion: 0.22
Nodes (8): ndarray, DWaveAdapter, Any, Translates, solves, and decodes generic QuboIR models for D-Wave solvers with…, Convert dense upper-triangular numpy matrix to D-Wave sparse coordinate dict., Build BQM and solve using the D-Wave sampler with feasibility verification., Validate mathematical structure of the generated Q matrix., validate_qubo()

### Community 37 - "main.py"
Cohesion: 0.27
Nodes (9): DWaveRequest, get_news(), health_check(), BaseModel, get, post, QiskitRequest, simulate_dwave() (+1 more)

### Community 39 - "TestLosslessnessAtScale"
Cohesion: 0.18
Nodes (6): Every single value in a 100×100 matrix must be exactly preserved., Float precision preserved to full Python float resolution., 20 separate arrays — all data from all blocks exactly recovered., Array of all-same values — no deduplication or corruption., Very large and very small floats preserved exactly., TestLosslessnessAtScale

### Community 40 - "TestPerformance"
Cohesion: 0.18
Nodes (6): 10,000 element list should extract in under 2 seconds., 200×200 matrix (40,000 values) should extract in under 10 seconds., Empty text should return near-instantly., Long text with no numbers — near-instant., 100 separate 50-element arrays — 5000 total values, 100 blocks., TestPerformance

### Community 41 - "qubo_backend.py"
Cohesion: 0.24
Nodes (9): compile_om_to_qubo_code(), compile_om_to_qubo_result(), _eval_str_expr(), _generate_sampler_code(), Any, Return Python source code (as a string) that, when executed, builds the CQM,…, Safely evaluate a stringified expression using the variable object dict., Generate a minimal runnable sampler script from a Q matrix. (+1 more)

### Community 42 - "ObjectiveNode"
Cohesion: 0.20
Nodes (6): ObjectiveNode, A fully symbolic, solver-independent objective representation. This is the…, Emit dimod CQM objective expression string., Emit OR-Tools CP-SAT objective expression string., Emit LaTeX math string for UI rendering., Emit AutoQUBO objective function body (x is a flat binary vector).

### Community 43 - "log_engagement"
Cohesion: 0.24
Nodes (8): _db_log_worker(), _get_mongo_db(), log_engagement(), Execution Logger — QuantumGuru Engine v3 Logs all model inputs/outputs to a…, Log an LLM execution to a formatted log file and asynchronously to MongoDB., _call_openai_compat(), Qwen 3 32B Client — QuantumGuru Engine v3 Inference: RunPod vLLM…, Generic OpenAI-compatible chat completion call.

### Community 44 - "deploy"
Cohesion: 0.20
Nodes (9): build, buildCommand, builder, deploy, numReplicas, restartPolicyMaxRetries, restartPolicyType, startCommand (+1 more)

### Community 45 - "dependencies"
Cohesion: 0.22
Nodes (9): cheerio, dependencies, cheerio, react-dom, react-hot-toast, reactflow, react-dom, react-hot-toast (+1 more)

### Community 47 - "TestMultipleBlocks"
Cohesion: 0.22
Nodes (4): Two separate 1D lists should produce two separate blocks, NOT one 2D., Small list next to large list — only large should be extracted., Variable name before = should remain in slim_text., TestMultipleBlocks

### Community 48 - "seed_articles.js"
Cohesion: 0.22
Nodes (6): articles, ArticleSchema, env, fs, mongoose, path

### Community 49 - "prompts/route.ts"
Cohesion: 0.31
Nodes (6): dynamic, GET(), PUT(), defaultPrompts, seedSystemPrompts(), SystemPromptSchema

### Community 56 - "ObjectiveTemplate"
Cohesion: 0.25
Nodes (3): ObjectiveTemplate, Canonical objective: sense Σ_i coeff[i] · x[i] E.g. maximize Σ revenue[i] · x[i], Returns an objective function definition string for AutoQUBO.

### Community 57 - "SupervisorAgent"
Cohesion: 0.39
Nodes (7): SupervisorAgent, format_q_matrix_preview(), Optimization Pipeline — QuantumGuru Engine v3 (Multi-Agent V7 Core) Routes to…, Streamed multi-agent optimization pipeline. Yields step updates as they…, Full QuantumGuru v7 multi-agent optimization pipeline., run_optimization_pipeline(), run_optimization_pipeline_stream()

### Community 59 - "execute/route.ts"
Cohesion: 0.36
Nodes (6): dynamic, POST(), dynamic, POST(), ../../../lib/auth, ../../../models/Hardware

### Community 60 - "dotenv"
Cohesion: 0.29
Nodes (3): dotenv, dotenv, QuantumGuru Engine v3 — Central Configuration Loads from OptiOS/.env…

### Community 61 - "TestRealisticProblems"
Cohesion: 0.29
Nodes (4): Realistic: 5 aircraft × 8 flights cost matrix embedded in NL problem., Realistic: knapsack with weights and values as separate 1D lists., Realistic: distance matrix in vehicle routing., TestRealisticProblems

### Community 62 - "users/route.ts"
Cohesion: 0.38
Nodes (6): DELETE(), dynamic, generateApiKey(), GET(), POST(), PUT()

### Community 63 - "constraint_templates.py"
Cohesion: 0.33
Nodes (5): ABC, get_template_class(), ObjectiveTerm, A single weighted variable term in an objective: coefficient × variable., Return the template class for a given constraint family name.

### Community 64 - "SandboxedVerifier"
Cohesion: 0.33
Nodes (4): Exception, CompilationError, Executes the compiled script in a sandboxed subprocess and validates that the…, SandboxedVerifier

### Community 66 - "eslint.config.mjs"
Cohesion: 0.40
Nodes (4): compat, __dirname, eslintConfig, __filename

### Community 67 - "runpod_start.sh"
Cohesion: 0.40
Nodes (4): HF_HOME, QWEN_BASE_URL, QWEN_MODEL, runpod_start.sh script

### Community 68 - "system-logs/route.ts"
Cohesion: 0.40
Nodes (3): dynamic, GET(), SystemLogSchema

### Community 69 - "QuantumFormFetcher.tsx"
Cohesion: 0.40
Nodes (3): IField, IForm, QuantumFormFetcherProps

### Community 70 - "vercel.json"
Cohesion: 0.40
Nodes (4): buildCommand, devCommand, framework, installCommand

## Knowledge Gaps
- **202 isolated node(s):** `IHardware`, `AdminSidebarProps`, `SidebarLinkProps`, `ILLMEntry`, `PasswordModalProps` (+197 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **64 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `extract_numeric_blocks()` connect `extract_numeric_blocks` to `TestEdgeCasesAtScale`, `_is_range_like`, `_is_all_numeric`, `TestLosslessnessAtScale`, `TestPerformance`, `_find_balanced_bracket`, `numeric_extractor.py`, `TestMultipleBlocks`, `TestSkipCases`, `.execute`, `compile_v66`, `_flatten`, `test_numeric_extractor.py`, `engine_enterprise_analyze`, `TestRealisticProblems`, `multi_agent.py`, `stress_test_numeric_extractor.py`?**
  _High betweenness centrality (0.122) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `devDependencies`, `dotenv`, `bcryptjs`, `axios`, `clsx`, `framer-motion`, `html2canvas`, `jspdf`, `lucide-react`, `@monaco-editor/react`, `mongoose`, `next`, `plotly.js`, `react`, `react-markdown`, `react-plotly.js`, `react-syntax-highlighter`, `recharts`, `remark-gfm`, `tailwind-merge`, `@types/react-syntax-highlighter`, `zod`, `zustand`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **Why does `dotenv` connect `dotenv` to `call_primary`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **Are the 82 inferred relationships involving `extract_numeric_blocks()` (e.g. with `engine_enterprise_analyze()` and `.test_all_zeros_matrix()`) actually correct?**
  _`extract_numeric_blocks()` has 82 INFERRED edges - model-reasoned connections that need verification._
- **Are the 5 inferred relationships involving `parse_spec_to_cmm()` (e.g. with `Expr` and `ProblemFamily`) actually correct?**
  _`parse_spec_to_cmm()` has 5 INFERRED edges - model-reasoned connections that need verification._
- **Are the 14 inferred relationships involving `Constraint` (e.g. with `ASTCompiler` and `BalancePrimitive`) actually correct?**
  _`Constraint` has 14 INFERRED edges - model-reasoned connections that need verification._
- **Are the 13 inferred relationships involving `Variable` (e.g. with `ASTCompiler` and `BalancePrimitive`) actually correct?**
  _`Variable` has 13 INFERRED edges - model-reasoned connections that need verification._