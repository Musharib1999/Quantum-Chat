import {
  ExecutionRun,
  FeasibilityCheckResult,
  MathematicalModel,
  OptimizationConstraint,
  OptimizationVariable,
  ProjectRecord,
  QMatrixData,
  SolverExecution,
  SolverRouting,
  SolverType,
  WorkspaceState,
} from "./types";

export const DEFAULT_PENALTY_LAMBDA = 5.0;

export function emptyMathModel(): MathematicalModel {
  return { objectiveSense: null, objectiveExpr: "", constraints: [] };
}

export function emptyWorkspace(): WorkspaceState {
  return {
    mathModel: emptyMathModel(),
    variables: [],
    feasibility: [],
    qMatrix: null,
    execution: null,
    solverRouting: null,
    code: "",
    penaltyLambda: DEFAULT_PENALTY_LAMBDA,
    selectedSolver: "dwave_sa",
    terminal: [],
  };
}

export function newProject(title = "New optimization model", domain = "Custom domain"): ProjectRecord {
  const now = Date.now();
  return {
    id: `proj_${now}_${Math.random().toString(36).slice(2, 7)}`,
    title,
    domain,
    createdAt: now,
    updatedAt: now,
    lastProblemText: "",
    messages: [],
    runs: [],
    activeRunId: null,
    workspace: emptyWorkspace(),
  };
}

const asNumber = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

function adaptExecution(raw: any): SolverExecution | null {
  if (!raw || typeof raw !== "object") return null;
  const energy = asNumber(raw.energy);
  const hasAnything = energy !== null || raw.feasible !== undefined || raw.solution;
  if (!hasAnything) return null;
  return {
    feasible: typeof raw.feasible === "boolean" ? raw.feasible : null,
    energy,
    objectiveValue: asNumber(raw.objective_value ?? raw.objectiveValue),
    solution: raw.solution && typeof raw.solution === "object" ? raw.solution : {},
    selectedVariables: Array.isArray(raw.selected_variables ?? raw.selectedVariables)
      ? (raw.selected_variables ?? raw.selectedVariables)
      : [],
    numReads: asNumber(raw.num_reads ?? raw.numReads),
    penaltyWeight: asNumber(raw.penalty_weight ?? raw.penaltyWeight),
    penaltyLabel: typeof (raw.penalty_label ?? raw.penaltyLabel) === "string" ? (raw.penalty_label ?? raw.penaltyLabel) : null,
  };
}

function adaptQMatrix(raw: any): QMatrixData | null {
  if (!raw || typeof raw !== "object" || !Array.isArray(raw.entries) || !Array.isArray(raw.variables)) return null;
  return {
    size: asNumber(raw.size) ?? raw.variables.length,
    variables: raw.variables,
    entries: raw.entries,
    nnz: asNumber(raw.nnz) ?? raw.entries.length,
    truncated: Boolean(raw.truncated),
    offset: asNumber(raw.offset),
    penaltyWeight: asNumber(raw.penalty_weight),
    penaltyLabel: typeof raw.penalty_label === "string" ? raw.penalty_label : null,
    decisionCount: asNumber(raw.decision_count) ?? 0,
    slackCount: asNumber(raw.slack_count) ?? 0,
  };
}

function toOp(op: string): OptimizationConstraint["op"] {
  if (op === ">=" || op === "==") return op;
  if (op === "=") return "==";
  return "<=";
}

/**
 * Convert the backend `complete` payload into workspace state.
 * Prefers the structured `result.enterprise` block. When it is absent (e.g. the Next.js
 * zero-inference fallback path), only what that path actually provides is mapped; every
 * other field stays empty rather than being invented.
 */
export function adaptPipelineResult(result: any, prev: WorkspaceState): WorkspaceState {
  const res = result || {};
  const ent = res.enterprise;

  let mathModel: MathematicalModel;
  let variables: OptimizationVariable[];
  let feasibility: FeasibilityCheckResult[];
  let qMatrix: QMatrixData | null;
  let execution: SolverExecution | null;

  if (ent && typeof ent === "object") {
    const sense = ent.objective?.sense;
    const constraints: any[] = Array.isArray(ent.constraints) ? ent.constraints : [];
    mathModel = {
      objectiveSense: sense === "maximize" ? "Maximize" : sense === "minimize" ? "Minimize" : null,
      objectiveExpr: ent.objective?.expression || "",
      constraints: constraints.map((c, idx) => ({
        id: c.id || `c_${idx}`,
        name: c.name || `Constraint ${idx + 1}`,
        leftExpr: c.left || "",
        op: toOp(c.op),
        rightVal: asNumber(c.right),
      })),
    };
    variables = (Array.isArray(ent.variables) ? ent.variables : []).map((v: any) => ({
      name: v.name,
      varType: v.var_type || "BINARY",
      lowerBound: asNumber(v.lower_bound),
      upperBound: asNumber(v.upper_bound),
      description: v.description ?? null,
    }));
    feasibility = constraints.map((c) => ({
      name: c.name,
      lhsFormula: c.left || "",
      op: toOp(c.op),
      rhs: asNumber(c.right),
      computedLhs: asNumber(c.lhs_value),
      satisfied: typeof c.satisfied === "boolean" ? c.satisfied : null,
      slack: asNumber(c.slack),
      slackBits: asNumber(c.slack_bits),
    }));
    qMatrix = adaptQMatrix(ent.q_matrix);
    execution = adaptExecution(ent.execution);
  } else {
    // Legacy / fallback shape
    let parsed = res.parsed_math;
    if (typeof parsed === "string") {
      try {
        parsed = JSON.parse(parsed);
      } catch {
        parsed = null;
      }
    }
    const legacyConstraints: any[] = Array.isArray(parsed?.constraints) ? parsed.constraints : [];
    const objSense = parsed?.objective?.sense;
    mathModel = {
      objectiveSense:
        typeof objSense === "string" ? (objSense.toLowerCase() === "maximize" ? "Maximize" : "Minimize") : null,
      objectiveExpr: typeof parsed?.objective?.expression === "string" ? parsed.objective.expression : "",
      constraints: legacyConstraints.map((c, idx) => ({
        id: `c_${idx}`,
        name: c.name || `Constraint ${idx + 1}`,
        leftExpr: c.left || "",
        op: toOp(c.op || "<="),
        rightVal: asNumber(typeof c.right === "string" ? parseFloat(c.right) : c.right),
      })),
    };
    variables = (Array.isArray(res.variable_map) ? res.variable_map : []).map((n: any) => ({
      name: typeof n === "string" ? n : n?.name,
      varType: "BINARY" as const,
      lowerBound: 0,
      upperBound: 1,
      description: null,
    }));
    feasibility = [];
    qMatrix = null;
    execution = adaptExecution(res.execution_result);
  }

  const routing: SolverRouting | null = res.solver_routing
    ? {
        selected: typeof res.solver_routing.selected_solver === "string" ? res.solver_routing.selected_solver : null,
        reasons: Array.isArray(res.solver_routing.reasons) ? res.solver_routing.reasons : [],
      }
    : null;

  // The QUBO pipeline always samples with the D-Wave simulated annealer.
  const selectedSolver: SolverType =
    routing?.selected && /qubo/i.test(routing.selected) ? "dwave_sa" : prev.selectedSolver;

  return {
    mathModel,
    variables,
    feasibility,
    qMatrix,
    execution,
    solverRouting: routing,
    code: typeof res.final_code === "string" ? res.final_code : "",
    penaltyLambda: execution?.penaltyWeight ?? prev.penaltyLambda,
    selectedSolver,
    terminal: prev.terminal,
  };
}

/** Compact LaTeX for a plain-text expression such as `(14.0 * x_0) + (18.0 * x_1)`. */
export function exprToLatex(expr: string): string {
  const MAX_TERMS = 14;
  const split = (s: string): string[] => {
    const parts: string[] = [];
    let depth = 0;
    let cur = "";
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (ch === "(") depth++;
      if (ch === ")") depth--;
      if (depth === 0 && ch === "+" && s[i - 1] === " " && s[i + 1] === " ") {
        parts.push(cur.trim());
        cur = "";
      } else {
        cur += ch;
      }
    }
    if (cur.trim()) parts.push(cur.trim());
    return parts;
  };

  const terms = split(expr);
  const shown =
    terms.length > MAX_TERMS ? [...terms.slice(0, 8), "\\cdots", ...terms.slice(-2)] : terms;

  const convert = (t: string) =>
    t === "\\cdots"
      ? t
      : t
          .replace(/[A-Za-z_][A-Za-z0-9_]*/g, (id) => `\\mathrm{${id.replace(/_/g, "\\_")}}`)
          .replace(/\s*\*\s*/g, " \\cdot ");

  return shown.map(convert).join(" + ");
}

export function termCount(expr: string): number {
  if (!expr) return 0;
  let depth = 0;
  let count = 1;
  for (let i = 0; i < expr.length; i++) {
    const ch = expr[i];
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (depth === 0 && ch === "+" && expr[i - 1] === " " && expr[i + 1] === " ") count++;
  }
  return count;
}

export function runFromWorkspace(args: {
  id: string;
  runNumber: number;
  title: string;
  runtimeMs: number | null;
  changesSummary: string;
  workspace: WorkspaceState;
}): ExecutionRun {
  const { workspace } = args;
  return {
    id: args.id,
    runNumber: args.runNumber,
    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    problemTitle: args.title,
    solver: workspace.selectedSolver,
    penaltyLambda: workspace.penaltyLambda,
    energy: workspace.execution?.energy ?? null,
    feasible: workspace.execution?.feasible ?? null,
    runtimeMs: args.runtimeMs,
    objectiveSense: workspace.mathModel.objectiveSense,
    solution: workspace.execution?.solution ?? {},
    activeSelections: workspace.execution?.selectedVariables ?? [],
    changesSummary: args.changesSummary,
    snapshot: workspace,
  };
}
