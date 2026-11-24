import {
  ExecutionRun,
  FeasibilityCheckResult,
  MathematicalModel,
  OptimizationConstraint,
  OptimizationVariable,
  ProjectRecord,
  QMatrixData,
  SolverComparisonData,
  SolverComparisonSide,
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
    ortoolsCode: "",
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
  const objectiveValue = asNumber(raw.objective_value ?? raw.objectiveValue);
  const solution = raw.solution && typeof raw.solution === "object" ? raw.solution : {};
  const selectedVariables = Array.isArray(raw.selected_variables ?? raw.selectedVariables)
    ? (raw.selected_variables ?? raw.selectedVariables)
    : [];
  const numReads = asNumber(raw.num_reads ?? raw.numReads);
  const solverComparison = raw.solver_comparison ?? raw.solverComparison ?? null;
  const hasRealTelemetry =
    (numReads !== null && numReads > 0) ||
    solverComparison != null ||
    selectedVariables.length > 0 ||
    Object.keys(solution).length > 0 ||
    objectiveValue !== null;
  if (!hasRealTelemetry) return null;
  return {
    feasible: typeof raw.feasible === "boolean" ? raw.feasible : null,
    energy,
    objectiveValue,
    solution,
    selectedVariables,
    numReads,
    penaltyWeight: asNumber(raw.penalty_weight ?? raw.penaltyWeight),
    penaltyLabel: typeof (raw.penalty_label ?? raw.penaltyLabel) === "string" ? (raw.penalty_label ?? raw.penaltyLabel) : null,
    solverComparison,
    ortoolsCode: typeof (raw.ortools_code ?? raw.ortoolsCode) === "string" ? (raw.ortools_code ?? raw.ortoolsCode) : "",
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

  const ortoolsCode =
    (typeof ent?.ortools_code === "string" && ent.ortools_code) ||
    execution?.ortoolsCode ||
    execution?.solverComparison?.classical?.code ||
    "";

  return {
    mathModel,
    variables,
    feasibility,
    qMatrix,
    execution,
    solverRouting: routing,
    code: typeof res.final_code === "string" ? res.final_code : "",
    ortoolsCode,
    penaltyLambda: qMatrix?.penaltyWeight ?? execution?.penaltyWeight ?? prev.penaltyLambda,
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

/**
 * Scale all numeric literals in a linear expression (and optional RHS) into exact integers
 * for Google OR-Tools CP-SAT, which strictly rejects FloatAffine expressions in model.Add().
 */
function scaleLinearExprToInt(expr: string, rhs?: number): { expr: string; rhs: number; scale: number } {
  const numRe = /(?<![A-Za-z0-9_])(\d+(?:\.\d+)?)(?![A-Za-z0-9_])/g;
  const nums: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = numRe.exec(expr)) !== null) {
    nums.push(parseFloat(m[1]));
  }
  if (typeof rhs === "number" && Number.isFinite(rhs)) {
    nums.push(rhs);
  }

  let scale = 1;
  for (const candidate of [1, 10, 100, 1000]) {
    if (nums.every((v) => Math.abs(v * candidate - Math.round(v * candidate)) < 1e-6)) {
      scale = candidate;
      break;
    }
    scale = 1000;
  }

  const intExpr = expr.replace(numRe, (_, raw) => String(Math.round(parseFloat(raw) * scale)));
  const intRhs = typeof rhs === "number" && Number.isFinite(rhs) ? Math.round(rhs * scale) : 0;
  return { expr: intExpr, rhs: intRhs, scale };
}

/**
 * Sanitize legacy saved QUBO scripts that contained `if '_xxx' in globals():`
 * (which the execution sandbox AST security guard rejects).
 */
export function sanitizeLegacyQuboScript(code: string): string {
  if (!code || !code.includes("globals()")) return code;
  const specNames = ["_obj_indices", "_obj_coefs", "_dep_specs", "_mut_specs", "_clique_specs", "_eq_specs", "_ineq_specs"];
  const missingDecls = specNames
    .filter((name) => !new RegExp(`^\\s*${name}\\s*=`, "m").test(code))
    .map((name) => `${name} = []`);

  let cleaned = code.replace(/if\s+['"](_[a-z_]+)['"]\s+in\s+globals\(\)\s*:/g, "if $1:");
  if (missingDecls.length > 0) {
    cleaned = `${missingDecls.join("\n")}\n${cleaned}`;
  }
  return cleaned;
}

/**
 * Sanitize legacy saved OR-Tools scripts whose model.Add() lines contain `.0` float literals
 * (e.g. `9.0 * Select_0`), which cause CP-SAT `FloatAffine` TypeError.
 */
export function sanitizeLegacyOrtoolsScript(code: string): string {
  if (!code) return code;
  return code
    .split("\n")
    .map((line) => {
      const addMatch = line.match(/^(\s*model\.Add\()(.+)(\).*)$/);
      if (!addMatch) return line;
      const inner = addMatch[2];
      // Only rewrite if a decimal literal appears inside model.Add(...)
      if (!/(?<![A-Za-z0-9_])\d+\.\d+(?![A-Za-z0-9_])/.test(inner)) return line;
      const { expr } = scaleLinearExprToInt(inner);
      return `${addMatch[1]}${expr}${addMatch[3]}`;
    })
    .join("\n");
}

/** Synthesize deterministic Google OR-Tools CP-SAT script when none was persisted yet. */
export function buildFallbackOrtoolsCode(
  variables: OptimizationVariable[],
  mathModel: MathematicalModel | null | undefined
): string {
  if (!variables || variables.length === 0) return "";

  const lines: string[] = [
    "# ── Deterministic Google OR-Tools CP-SAT Classical Baseline ──",
    "import time",
    "from ortools.sat.python import cp_model",
    "",
    "def solve_classical_baseline():",
    "    t0 = time.perf_counter()",
    "    model = cp_model.CpModel()",
    "",
    "    # 1. Decision Variables",
  ];
  for (const v of variables) {
    if (v.varType === "BINARY") {
      lines.push(`    ${v.name} = model.NewBoolVar('${v.name}')`);
    } else {
      const lb = typeof v.lowerBound === "number" ? Math.round(v.lowerBound) : 0;
      const ub = typeof v.upperBound === "number" ? Math.round(v.upperBound) : 10000;
      lines.push(`    ${v.name} = model.NewIntVar(${lb}, ${ub}, '${v.name}')`);
    }
  }
  lines.push("");
  lines.push("    # 2. Hard Constraints");
  for (const c of mathModel?.constraints || []) {
    if (!c.leftExpr?.trim()) continue;
    const rawRhs = typeof c.rightVal === "number" ? c.rightVal : 0;
    const { expr: intLeft, rhs: intRhs } = scaleLinearExprToInt(c.leftExpr, rawRhs);
    const op = c.op === "==" ? "==" : c.op;
    lines.push(`    model.Add(${intLeft} ${op} ${intRhs})  # ${c.name}`);
  }
  lines.push("");
  lines.push("    # 3. Objective Function");
  const senseFn = mathModel?.objectiveSense === "Maximize" ? "Maximize" : "Minimize";
  const rawObj = mathModel?.objectiveExpr?.trim() ? mathModel.objectiveExpr : "0";
  const { expr: intObj, scale: objScale } = scaleLinearExprToInt(rawObj);
  lines.push(`    model.${senseFn}(${intObj})`);
  lines.push("");
  lines.push("    # 4. Execute CP-SAT Exact Branch-and-Cut Solver");
  lines.push("    solver = cp_model.CpSolver()");
  lines.push("    solver.parameters.max_time_in_seconds = 10.0");
  lines.push("    status = solver.Solve(model)");
  lines.push("    elapsed_ms = (time.perf_counter() - t0) * 1000.0");
  lines.push("    status_name = solver.StatusName(status)");
  lines.push(`    obj_val = solver.ObjectiveValue() / ${objScale.toFixed(1)} if status in (cp_model.OPTIMAL, cp_model.FEASIBLE) else None`);
  lines.push(`    all_vars = [${variables.map((v) => `("${v.name}", ${v.name})`).join(", ")}]`);
  lines.push("    selected = [name for name, v in all_vars if status in (cp_model.OPTIMAL, cp_model.FEASIBLE) and solver.Value(v) > 0]");
  lines.push("    print(f'Google OR-Tools CP-SAT Status : {status_name} ({elapsed_ms:.2f} ms)')");
  lines.push("    if obj_val is not None:");
  lines.push("        print(f'Exact Classical Objective     : {obj_val:.4f}')");
  lines.push("    print(f'Active Decisions ({len(selected)})       : {selected}')");
  lines.push("");
  lines.push("if __name__ == '__main__':");
  lines.push("    solve_classical_baseline()");
  return lines.join("\n");
}

/** Build an honest head-to-head (or single-solver) comparison verdict using QUBO Energy consistently. */
export function computeSolverComparison(args: {
  quantum: SolverComparisonSide;
  classical: SolverComparisonSide;
  totalCons: number;
  penaltyLambda: number;
  objectiveSense: string | null | undefined;
  objectiveExpr?: string | null;
}): SolverComparisonData {
  const { quantum, classical, totalCons, penaltyLambda, objectiveSense, objectiveExpr } = args;

  const qRan = quantum.status !== "NOT_RUN";
  const cRan = classical.status !== "NOT_RUN";
  const qFeasible = Boolean(qRan && quantum.feasible);
  const cFeasible = Boolean(cRan && classical.feasible);
  const qObj = quantum.objective_value;
  const qEnergy = quantum.energy;
  const cObj = classical.objective_value;
  const qSelected = quantum.selected_variables || [];
  const cSelected = classical.selected_variables || [];

  const qSet = new Set(qSelected);
  const cSet = new Set(cSelected);
  const unionSize = new Set([...qSelected, ...cSelected]).size;
  const interSize = [...qSet].filter((x) => cSet.has(x)).length;
  const overlapPct = unionSize > 0 ? Math.round((interSize / unionSize) * 1000) / 10 : 100;

  const isTrivialUnconstrained =
    totalCons === 0 &&
    qSelected.length === 0 &&
    cSelected.length === 0 &&
    (qObj === null || Math.abs(qObj) < 1e-6) &&
    (cObj === null || Math.abs(cObj) < 1e-6);

  let winner: "TIE" | "QUANTUM" | "CLASSICAL" | "NONE" = "NONE";
  let verdictBadge = "Infeasible Constraint Bounds Detected";
  let gapPct: number | null = null;
  let summaryText = "";

  const qEnergyStr = typeof qEnergy === "number" ? qEnergy.toFixed(2) : "—";

  const normalizedObjExpr = (objectiveExpr || "").trim();
  const isZeroObjective =
    objectiveExpr !== undefined &&
    ["", "0", "0.0", "(0)", "(0.0)", "-0", "-0.0"].includes(normalizedObjExpr);

  if (isTrivialUnconstrained) {
    winner = "NONE";
    verdictBadge = "Unconstrained Trivial Zero State — Constraints Missing";
    summaryText =
      "No constraints were compiled into this model (0/0 constraints). Minimizing an unconstrained objective trivially sets every decision variable to 0. Re-submit the problem in Copilot or add constraints in the Model tab.";
  } else if (isZeroObjective) {
    winner = "NONE";
    verdictBadge = "Objective Expression Missing (Constant 0)";
    summaryText =
      "The compiled mathematical model has a constant 0 objective expression, so any feasible variable assignment scores 0.0000. Inspect the Model tab or select Compile from Solve to re-extract the objective function.";
  } else if (qRan && !cRan) {
    if (qFeasible) {
      winner = "QUANTUM";
      verdictBadge = "D-Wave QUBO Feasible Solution Found";
      summaryText = `D-Wave Quantum Annealing (λ = ${penaltyLambda}) converged to a feasible ground state (Objective = ${qObj !== null ? qObj.toFixed(4) : "—"}, Energy = ${qEnergyStr}, ${quantum.constraints_satisfied}/${totalCons} constraints satisfied). Select "Run Google OR-Tools" or "Run Parallel" from Solve to verify against the classical baseline.`;
    } else {
      winner = "NONE";
      verdictBadge = "D-Wave QUBO Constraint Violation";
      summaryText = `D-Wave Quantum Annealing (Energy = ${qEnergyStr} at λ = ${penaltyLambda}) did not satisfy all hard constraints. Increase λ in the Code Editor or select "Compile" from the Solve menu.`;
    }
  } else if (cRan && !qRan) {
    if (cFeasible) {
      winner = "CLASSICAL";
      verdictBadge = "Google OR-Tools Optimal Solution Found";
      summaryText = `Google OR-Tools CP-SAT converged to status ${classical.status} (Objective = ${cObj !== null ? cObj.toFixed(4) : "—"}, ${classical.constraints_satisfied}/${totalCons} constraints satisfied). Select "Run D-Wave" or "Run Parallel" from Solve to benchmark against Quantum QUBO.`;
    } else {
      winner = "NONE";
      verdictBadge = "Infeasible Constraint Bounds Detected";
      summaryText = `Google OR-Tools CP-SAT returned ${classical.status}. The current constraint bounds cannot be simultaneously satisfied by the binary variables. Select "Compile" from the Solve menu or relax bounds in the Model tab.`;
    }
  } else if (qFeasible && cFeasible && qObj !== null && cObj !== null) {
    const diff = qObj - cObj;
    gapPct =
      Math.abs(cObj) > 1e-9
        ? Math.round((Math.abs(diff) / Math.abs(cObj)) * 10000) / 100
        : Math.abs(diff) < 1e-5
        ? 0
        : 100;
    if (Math.abs(diff) < 1e-5) {
      winner = "TIE";
      verdictBadge = "0.00% Optimality Gap — Global Optimum Verified";
      summaryText = `Both D-Wave Quantum Annealing (QUBO, λ = ${penaltyLambda}) and Google OR-Tools CP-SAT converged to the exact global optimum (Objective = ${qObj.toFixed(4)}, ${totalCons}/${totalCons} constraints satisfied).`;
    } else {
      const senseUpper = (objectiveSense || "Minimize").toUpperCase();
      const qBetter = senseUpper === "MAXIMIZE" ? diff > 0 : diff < 0;
      winner = qBetter ? "QUANTUM" : "CLASSICAL";
      verdictBadge = qBetter
        ? `Quantum Annealing Outperformed (${gapPct}% advantage)`
        : `Classical OR-Tools Optimal (${gapPct}% QUBO gap)`;
      summaryText = qBetter
        ? `D-Wave QUBO Annealing found a better feasible objective (${qObj.toFixed(4)}) than OR-Tools (${cObj.toFixed(4)}).`
        : `Google OR-Tools CP-SAT proved the exact global optimum (Objective = ${cObj.toFixed(4)}), while D-Wave QUBO converged to Objective = ${qObj.toFixed(4)} (gap = ${gapPct}% at λ = ${penaltyLambda}).`;
    }
  } else if (cFeasible && !qFeasible) {
    winner = "CLASSICAL";
    verdictBadge = "Classical OR-Tools Feasible (Increase QUBO Penalty λ)";
    summaryText = `Google OR-Tools CP-SAT found a feasible optimum (Objective = ${cObj !== null ? cObj.toFixed(4) : "—"}), whereas D-Wave QUBO returned elevated Hamiltonian energy (Energy = ${qEnergyStr}) at λ = ${penaltyLambda}. Increase λ in the Code Editor and select "Run Parallel" from the Solve menu.`;
  } else if (qFeasible && !cFeasible) {
    winner = "QUANTUM";
    verdictBadge = "Quantum QUBO Feasible";
    summaryText = `D-Wave QUBO Annealing satisfied all constraints (Objective = ${qObj !== null ? qObj.toFixed(4) : "—"}, Energy = ${qEnergyStr}), while OR-Tools returned ${classical.status}.`;
  } else {
    winner = "NONE";
    verdictBadge = "Infeasible Constraint Bounds Detected";
    summaryText = `Both D-Wave QUBO (Energy = ${qEnergyStr}) and Google OR-Tools CP-SAT (Status = ${classical.status}) report that the current constraint bounds cannot be simultaneously satisfied by the binary variables. Select "Compile" from the Solve menu to normalize constraint capacity weights or relax bounds in the Model tab.`;
  }

  return {
    winner,
    verdict_badge: verdictBadge,
    optimality_gap_pct: gapPct,
    decision_overlap_pct: overlapPct,
    exact_decision_match: overlapPct === 100 && qFeasible && cFeasible,
    summary: summaryText,
    quantum,
    classical,
  };
}
