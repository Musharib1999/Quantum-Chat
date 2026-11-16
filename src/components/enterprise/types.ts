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
  };
  isStreaming?: boolean;
}

export interface ProjectRecord {
  id: string;
  title: string;
  domain: string;
  createdAt: number;
  updatedAt: number;
  /** Last problem text submitted; used by Recompile & Solve. */
  lastProblemText: string;
  messages: EnterpriseChatMessage[];
  /** Newest first. */
  runs: ExecutionRun[];
  activeRunId: string | null;
  workspace: WorkspaceState;
}
