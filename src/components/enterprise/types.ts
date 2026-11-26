export type SolverType =
  | "dwave_sa"
  | "dwave_advantage"
  | "dwave_cqm"
  | "ortools_classical";

export interface OptimizationVariable {
  name: string;
  varType: "BINARY" | "INTEGER" | "CONTINUOUS";
  lowerBound?: number | null;
  upperBound?: number | null;
  description?: string | null;
}

export interface OptimizationConstraint {
  id: string;
  name: string;
  leftExpr: string;
  op: "<=" | ">=" | "==";
  /** null when the pipeline did not extract a numeric bound */
  rightVal: number | null;
  description?: string;
}

export interface MathematicalModel {
  /** null when the pipeline did not extract an objective */
  objectiveSense: "Minimize" | "Maximize" | null;
  /** Plain-text objective expression as compiled (not LaTeX). Empty when not extracted. */
  objectiveExpr: string;
  constraints: OptimizationConstraint[];
}

export interface FeasibilityCheckResult {
  name: string;
  lhsFormula: string;
  op: string;
  rhs: number | null;
  computedLhs: number | null;
  satisfied: boolean | null;
  slack: number | null;
  slackBits: number | null;
}

export interface QMatrixEntry {
  i: number;
  j: number;
  value: number;
}

export interface QMatrixData {
  size: number;
  variables: Array<{ name: string; kind: "decision" | "slack" }>;
  entries: QMatrixEntry[];
  nnz: number;
  truncated: boolean;
  offset: number | null;
  penaltyWeight: number | null;
  penaltyLabel: string | null;
  decisionCount: number;
  slackCount: number;
}

export interface SolverComparisonSide {
  solver: string;
  status: string;
  feasible: boolean | null;
  objective_value: number | null;
  energy?: number | null;
  selected_variables: string[];
  constraints_satisfied: number;
  constraints_total: number;
  solve_time_ms: number | null;
  logical_qubits?: number;
  penalty_lambda?: number;
  code?: string;
}

export interface SolverComparisonData {
  winner: "TIE" | "QUANTUM" | "CLASSICAL" | "NONE";
  verdict_badge: string;
  optimality_gap_pct: number | null;
  decision_overlap_pct: number | null;
  exact_decision_match: boolean;
  summary: string;
  quantum: SolverComparisonSide;
  classical: SolverComparisonSide;
}

/** Solver result exactly as produced by the sampler. */
export interface SolverExecution {
  feasible: boolean | null;
  energy: number | null;
  objectiveValue: number | null;
  solution: Record<string, number>;
  selectedVariables: string[];
  numReads: number | null;
  penaltyWeight: number | null;
  penaltyLabel: string | null;
  solverComparison?: SolverComparisonData | null;
  ortoolsCode?: string;
}

export interface SolverRouting {
  selected: string | null;
  reasons: string[];
}

/** Everything the workbench renders for one project. Empty until a problem is solved. */
export interface WorkspaceState {
  mathModel: MathematicalModel;
  variables: OptimizationVariable[];
  feasibility: FeasibilityCheckResult[];
  qMatrix: QMatrixData | null;
  execution: SolverExecution | null;
  solverRouting: SolverRouting | null;
  code: string;
  ortoolsCode?: string;
  penaltyLambda: number;
  selectedSolver: SolverType;
  terminal: string[];
}

export interface ExecutionRun {
  id: string;
  runNumber: number;
  timestamp: string;
  problemTitle: string;
  solver: SolverType;
  penaltyLambda: number;
  energy: number | null;
  feasible: boolean | null;
  runtimeMs: number | null;
  objectiveSense: "Minimize" | "Maximize" | null;
  solution: Record<string, number>;
  activeSelections: string[];
  changesSummary?: string;
  /** Full workspace at the end of this run so selecting it restores every tab. */
  snapshot: WorkspaceState;
}

export interface EnterpriseChatMessage {
  id: string;
  sender: "user" | "assistant";
  timestamp: string;
  text: string;
  pipelineSteps?: Array<{
    id: string;
    agent: string;
    title: string;
    status: "pending" | "running" | "done" | "failed";
    message?: string;
    details?: string;
  }>;
  executionResult?: {
    feasible: boolean | null;
    energy: number | null;
    solution: Record<string, number>;
    selected_variables: string[];
    num_reads?: number | null;
    interpretation?: string;
    solver_comparison?: SolverComparisonData | null;
  };
  compiledSummary?: {
    variablesCount: number;
    constraintsCount: number;
    qMatrixSize: number | null;
    penaltyLambda: number;
    hasOrtools: boolean;
    hasQubo: boolean;
  };
  isStreaming?: boolean;
}

export type SurfaceMode = "copilot" | "workbench" | "library";

/** Reference back to the Verified Industry Problem Library entry a project was opened from. */
export interface LibraryReference {
  slug: string;
  version: number;
  title: string;
  objectiveSense: "Minimize" | "Maximize";
  bestKnown: {
    value: number;
    kind: "proven_optimal" | "published_optimal";
    method: string;
  };
}

export interface ProjectRecord {
  id: string;
  title: string;
  domain: string;
  createdAt: number;
  updatedAt: number;
  /** Last problem text submitted; used by Recompile & Solve. */
  lastProblemText: string;
  /** Prompt text of the last SUCCESSFUL compile; used to skip UnderstandingAgent on identical recompile. */
  lastCompiledPrompt?: string;
  /** Parsed problem_specification JSON from the last SUCCESSFUL compile (cleared on error or Model edit). */
  lastCompiledSpec?: Record<string, any> | null;
  messages: EnterpriseChatMessage[];
  /** Newest first. */
  runs: ExecutionRun[];
  activeRunId: string | null;
  workspace: WorkspaceState;
  /** Set when the project was opened from the Problem Library. */
  libraryRef?: LibraryReference | null;
}
