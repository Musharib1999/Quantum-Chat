export type FrameworkType = "dwave" | "qiskit";

export type HeroTabType = "code" | "formulation" | "visual" | "results";

export interface ProjectItem {
  id: string;
  title: string;
  desc: string;
  framework: FrameworkType;
  updated: string;
  files: string[];
  activeFile: string;
  isCustom?: boolean;
  fileContents?: Record<string, string>;
  cloudSynced?: boolean;
}

export interface QiskitGateStep {
  gate: string;
  qubit: number;
  target?: number;
  params?: string;
}
