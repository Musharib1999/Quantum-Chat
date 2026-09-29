export type OptimizationSectionId = "01" | "02" | "03" | null;

export type HeroTabType = "code" | "formulation" | "visual" | "results";

export interface MathFormulationParams {
  budgetMax: number;
  yieldWeight: number;
  minDiversity: number;
  penaltyLambda: number;
  hasMutualExclusion: boolean;
  hasCarbonCeiling: boolean;
  isMarkowitz: boolean;
}

export interface EnergyDistributionItem {
  energy: number;
  sample: Record<string, number>;
  num_occurrences: number;
  bitstring: string;
}

export interface OptimizationResults {
  energy: number;
  sample: Record<string, number>;
  num_variables: number;
  variables: string[];
  qubo_matrix: number[][];
  energy_distribution: EnergyDistributionItem[];
  num_reads?: number;
  cloud_rerouted?: boolean;
  qaoa_dual_compiled?: boolean;
  latex_formula?: string;
}

export interface PipelineStep {
  id: string;
  agent: string;
  title: string;
  status: "pending" | "running" | "done" | "failed";
  message?: string;
  details?: string;
  timestamp?: string;
}

export interface FormulationMeta {
  objectiveSense?: string;
  objectiveExpr?: string;
  variables?: string[];
  constraints?: { name: string; left: string; op: string; right: number }[];
  penaltyWeight?: number;
  penaltyLabel?: string;
  q_size?: number;
  q_nnz?: number;
  matrixDensity?: number;
}

export interface CopilotMessage {
  id: number;
  sender: "user" | "assistant";
  text: string;
  mathFormula?: string;
  breakdown?: string[];
  isMutualProposal?: boolean;
  timestamp: string;
  pipelineSteps?: PipelineStep[];
  generatedCode?: string;
  appliedToEditor?: boolean;
  formulationMeta?: FormulationMeta;
  isStreaming?: boolean;
}

export interface ThemeColors {
  bgSection1: string;
  bgSection2: string;
  bgSection3: string;
  bgMain: string;
  bgHeader: string;
  bgSidebar: string;
  bgEditor: string;
  bgBottomDrawer: string;
  bgBottomDrawerHeader: string;
  bgCard: string;
  bgInput: string;
  bgPill: string;
  border: string;
  borderSection2: string;
  borderSubtle: string;
  textPrimary: string;
  textMuted: string;
  textCyan: string;
  textEmerald: string;
  textAmber: string;
  textSkyBlue: string;
}
