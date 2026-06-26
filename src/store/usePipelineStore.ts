import { create } from 'zustand';

export type PipelineStatus = 'draft' | 'pending_admin' | 'ready';

export interface Variable {
  id: string;
  name: string;
  priority: number;
  weight: number;
  description: string;
}

export interface OutputVisual {
  type: 'bar_chart' | 'line_chart' | 'scatter_chart' | 'table';
  title: string;
  xAxis?: string;
  yAxis?: string;
  columns?: string[];
}

export interface AnalyticsWidget {
  type: 'bar' | 'line' | 'table' | 'scatter';
  xAxis: string;
  yAxis: string;
}

export interface PipelineState {
  id: string | null;
  status: PipelineStatus;
  problemName: string;
  problemDefinition: string;
  currentIssues: string;
  variables: Variable[];
  hardware: string;
  analysisPrompt: string;
  reasoningTrace: string;
  quantumAlgorithmCode: string;
  analyticsWidgets: AnalyticsWidget[];
  outputVisuals: OutputVisual[];

  // Actions
  updateField: <K extends keyof PipelineState>(field: K, value: PipelineState[K]) => void;
  addVariable: (name: string, weight?: number, description?: string) => void;
  updateVariable: (id: string, patch: Partial<Variable>) => void;
  removeVariable: (id: string) => void;
  reorderVariables: (variables: Variable[]) => void;
  setOutputVisuals: (visuals: OutputVisual[]) => void;
  resetPipeline: () => void;
}

export const usePipelineStore = create<PipelineState>((set) => ({
  id: null,
  status: 'draft',
  problemName: '',
  problemDefinition: '',
  currentIssues: '',
  variables: [],
  hardware: '',
  analysisPrompt: '',
  reasoningTrace: '',
  quantumAlgorithmCode: '',
  analyticsWidgets: [],
  outputVisuals: [],

  updateField: (field, value) => set((state) => ({ ...state, [field]: value })),

  addVariable: (name, weight = 1.0, description = '') => set((state) => {
    if (state.variables.some(v => v.name.toLowerCase() === name.toLowerCase())) {
      return state;
    }
    const newVar: Variable = {
      id: Math.random().toString(36).substring(2, 11),
      name,
      priority: state.variables.length + 1,
      weight,
      description,
    };
    return { ...state, variables: [...state.variables, newVar] };
  }),

  updateVariable: (id, patch) => set((state) => ({
    variables: state.variables.map(v => v.id === id ? { ...v, ...patch } : v)
  })),

  removeVariable: (id) => set((state) => ({
    variables: state.variables.filter(v => v.id !== id).map((v, i) => ({ ...v, priority: i + 1 }))
  })),

  reorderVariables: (newVariables) => set(() => ({
    variables: newVariables.map((v, i) => ({ ...v, priority: i + 1 }))
  })),

  setOutputVisuals: (visuals) => set(() => ({ outputVisuals: visuals })),

  resetPipeline: () => set({
    id: null,
    status: 'draft',
    problemName: '',
    problemDefinition: '',
    currentIssues: '',
    variables: [],
    hardware: '',
    analysisPrompt: '',
    reasoningTrace: '',
    quantumAlgorithmCode: '',
    analyticsWidgets: [],
    outputVisuals: [],
  })
}));
