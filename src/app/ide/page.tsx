'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import IdeMarkdownRenderer from '@/components/IdeMarkdownRenderer';
import { 
  Play, 
  Zap, 
  Settings, 
  FileCode, 
  Folder, 
  ChevronRight, 
  ChevronDown, 
  Sparkles, 
  Terminal,
  Terminal as TerminalIcon,
  BarChart3,
  ChevronUp, 
  Activity, 
  Layers, 
  Cpu, 
  RotateCw, 
  Check, 
  Send,
  Bot,
  X,
  Server,
  Wrench,
  PanelLeft,
  PanelRight,
  Plus,
  Sun,
  Moon,
  GitBranch,
  Brain,
  CheckCircle2,
  HelpCircle,
  FolderPlus,
  LogOut,
  Trash2
} from 'lucide-react';

import { getBackendUrl } from '@/lib/backend';

const BACKEND_URL = getBackendUrl();

type AgentPhase = 
  | 'idle' 
  | 'thinking' 
  | 'planning' 
  | 'calling_tool' 
  | 'tool_name' 
  | 'writing_code' 
  | 'simulating' 
  | 'generating_output';

interface WorkflowStepItem {
  step_num: number;
  tool_tag: string;
  name: string;
  status: string;
  execution_time_ms: number;
  summary: string;
}

interface CodeMutation {
  fileName: string;
  action: string;
  linesAdded: number;
  linesRemoved: number;
  totalLines: number;
  summary: string;
}

interface ClarificationOptionItem {
  label: string;
  value: string;
  is_recommended?: boolean;
  description?: string;
}

interface ClarificationQuestionPayload {
  question: string;
  domain: string;
  scenario_id: string;
  options: ClarificationOptionItem[];
  default_value?: string;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  workflowSteps?: WorkflowStepItem[];
  scientificVerdict?: string;
  codeMutation?: CodeMutation;
  clarification?: ClarificationQuestionPayload;
  toolCall?: {
    name: string;
    badge: string;
    detail: string;
  };
}

// ── 🚀 ISOLATED COPILOT CHAT INPUT COMPONENT (ZERO ROOT RE-RENDERS ON KEYSTROKES) ──
interface CopilotChatInputProps {
  onSend: (text: string) => void;
  isThinking: boolean;
  colors: any;
  isDark: boolean;
  activeFile: string;
}

const CopilotChatInput = React.memo(function CopilotChatInput({
  onSend,
  isThinking,
  colors,
  isDark,
  activeFile
}: CopilotChatInputProps) {
  const [input, setInput] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !isThinking) {
        onSend(input.trim());
        setInput('');
      }
    }
  };

  const handleSendClick = () => {
    if (input.trim() && !isThinking) {
      onSend(input.trim());
      setInput('');
    }
  };

  return (
    <div 
      style={{ backgroundColor: colors.bgSection3, borderColor: colors.border }}
      className="p-3 border-t"
    >
      <div 
        style={{ backgroundColor: colors.bgInput, borderColor: colors.border }}
        className={`flex flex-col justify-between border rounded-xl p-2.5 transition-all shadow-2xs min-h-[82px] space-y-2 ${
          isDark ? 'focus-within:border-[#444444]' : 'focus-within:border-[#CBD5E1]'
        }`}
      >
        <textarea 
          rows={2}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a quantum question about your code or concepts (e.g. explain main.py)..."
          style={{ color: colors.textPrimary, outline: 'none', border: 'none', boxShadow: 'none' }}
          className="w-full bg-transparent border-0 outline-none focus:outline-none focus:ring-0 text-sm font-normal font-sans resize-none placeholder:text-slate-400 dark:placeholder:text-zinc-500 placeholder-slate-400 dark:placeholder-zinc-500 leading-relaxed"
        />
        
        <div className="flex items-center justify-end gap-2 pt-1.5 border-t" style={{ borderColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' }}>
          {/* Right: Send Button */}
          <button 
            onClick={handleSendClick}
            disabled={isThinking || !input.trim()}
            style={{ backgroundColor: colors.bgPill, color: colors.textCyan, borderColor: colors.border }}
            className="px-3 py-1 rounded-md flex items-center gap-1.5 transition-opacity hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs cursor-pointer border text-xs font-normal shrink-0"
          >
            <span>Ask</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
});

// ── ⚛️ ROBUST QUANTUM AST & QUBIT PARSERS (ACCESSIBLE TO ALL COMPONENTS) ──
function parseQiskitQubitCount(code: string): number {
  if (!code) return 4;
  const lines = code.split('\n');
  const variables: Record<string, number> = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#')) continue;
    const vMatch = trimmed.match(/^([a-zA-Z_]\w*)\s*=\s*(\d+)$/);
    if (vMatch) {
      variables[vMatch[1]] = parseInt(vMatch[2], 10);
    }
    const match = trimmed.match(/\bQuantumCircuit\s*\(\s*([a-zA-Z_]\w*|\d+)/i);
    if (match) {
      const raw = match[1];
      const parsed = variables[raw] !== undefined ? variables[raw] : parseInt(raw, 10);
      if (!isNaN(parsed) && parsed > 0) {
        return Math.max(1, Math.min(16, parsed));
      }
    }
  }
  return 4;
}

function evaluateSimpleExpr(expr: string, varName: string, val: number): any {
  const trimmed = expr.trim();
  if (trimmed === varName) return val;
  const num = parseInt(trimmed, 10);
  if (!isNaN(num) && String(num) === trimmed) return num;

  const match1 = trimmed.match(new RegExp('^' + varName + '\\s*([+\\-*])\\s*(\\d+)$'));
  if (match1) {
    const op = match1[1];
    const n = parseInt(match1[2], 10);
    if (op === '+') return val + n;
    if (op === '-') return val - n;
    if (op === '*') return val * n;
  }

  const match2 = trimmed.match(new RegExp('^(\\d+)\\s*([+\\-*])\\s*' + varName + '$'));
  if (match2) {
    const n = parseInt(match2[1], 10);
    const op = match2[2];
    if (op === '+') return n + val;
    if (op === '-') return n - val;
    if (op === '*') return n * val;
  }
  return trimmed;
}

function unrollQiskitLoops(code: string, numQubits: number = 4): string[] {
  if (!code) return [];
  const lines = code.split('\n');
  const variables: Record<string, number> = { n: numQubits, num_qubits: numQubits, qubits: numQubits, N: numQubits };

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#')) continue;
    const vMatch = trimmed.match(/^([a-zA-Z_]\w*)\s*=\s*(\d+)$/);
    if (vMatch) {
      variables[vMatch[1]] = parseInt(vMatch[2], 10);
    }
  }

  const unrolled: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    const loopMatch = trimmed.match(/^for\s+([a-zA-Z_]\w*)\s+in\s+(?:range\s*\(([^)]+)\)|\[([^\]]+)\])\s*:/);
    if (loopMatch) {
      const varName = loopMatch[1];
      const rangeArg = loopMatch[2];
      const listArg = loopMatch[3];

      let vals: number[] = [];
      if (listArg !== undefined) {
        vals = listArg.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
      } else if (rangeArg !== undefined) {
        const rawArgs = rangeArg.split(',').map(s => s.trim());
        const resolved = rawArgs.map(arg => {
          if (variables[arg] !== undefined) return variables[arg];
          const n = parseInt(arg, 10);
          return isNaN(n) ? numQubits : n;
        });

        if (resolved.length === 1) {
          for (let v = 0; v < resolved[0]; v++) vals.push(v);
        } else if (resolved.length === 2) {
          for (let v = resolved[0]; v < resolved[1]; v++) vals.push(v);
        } else if (resolved.length >= 3) {
          const step = resolved[2] !== 0 ? resolved[2] : 1;
          for (let v = resolved[0]; v < resolved[1]; v += step) vals.push(v);
        }
      }

      const loopBody: string[] = [];
      const colonIdx = trimmed.indexOf(':');
      const afterColon = trimmed.slice(colonIdx + 1).trim();
      if (afterColon) {
        loopBody.push(afterColon);
        i++;
      } else {
        i++;
        while (i < lines.length) {
          const subLine = lines[i];
          const subTrimmed = subLine.trim();
          if (subTrimmed && !subLine.startsWith(' ') && !subLine.startsWith('\t')) {
            break;
          }
          if (subTrimmed) loopBody.push(subTrimmed);
          i++;
        }
      }

      for (const val of vals) {
        for (const bLine of loopBody) {
          const unrolledLine = bLine.replace(/(\b\w+\.\w+)\s*\(([^)]*)\)/g, (call, func, rawArgsStr) => {
            const args = rawArgsStr.split(',').map((a: string) => evaluateSimpleExpr(a, varName, val));
            return `${func}(${args.join(', ')})`;
          });
          unrolled.push(unrolledLine);
        }
      }
      continue;
    }

    unrolled.push(line);
    i++;
  }
  return unrolled;
}

function parseQiskitCodeToGates(code: string, numQubits: number = 4): Array<{ name: string; qubit: number; step: number; target?: number; role?: 'control' | 'target' | 'single' }> {
  if (!code) return [];
  const gates: Array<{ name: string; qubit: number; step: number; target?: number; role?: 'control' | 'target' | 'single' }> = [];
  const stepTrack: Record<number, number> = {};
  for (let q = 0; q < numQubits; q++) stepTrack[q] = 0;

  try {
    const lines = unrollQiskitLoops(code, numQubits);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('.')) continue;

      // Check for explicit coordinate specification in comment (e.g., # t=3, # t3, # step: 4, # col 2)
      const coordMatch = trimmed.match(/#\s*(?:t\s*=?\s*|step\s*:?\s*|col\s*:?\s*|coord\s*:?\s*|\(\s*\d+\s*,\s*)(\d+)/i);
      const explicitStep = coordMatch ? parseInt(coordMatch[1], 10) : null;

      // Advance time slices on Qiskit barriers (synchronizes timeline without empty wasted columns)
      if (/\b\w+\.barrier\b/i.test(trimmed)) {
        const maxS = Math.max(0, ...Object.values(stepTrack));
        for (let q = 0; q < numQubits; q++) stepTrack[q] = Math.min(9, maxS);
        continue;
      }

      // ⚛️ Handle measure_all(): places measurement on all qubits in dedicated readout column
      if (/\b\w+\.measure_all\s*\(/i.test(trimmed)) {
        const maxS = Math.max(0, ...Object.values(stepTrack));
        const stepHasGates = gates.some(g => g.step === maxS);
        const targetStep = (explicitStep !== null && explicitStep >= 0 && explicitStep < 10) 
          ? explicitStep 
          : Math.min(9, stepHasGates ? maxS + 1 : maxS);
        for (let q = 0; q < numQubits; q++) {
          gates.push({ name: 'measure', qubit: q, step: targetStep, role: 'single' });
          stepTrack[q] = Math.min(9, targetStep + 1);
        }
        continue;
      }

      // Match Qiskit method calls: qc.h(0), circuit.cx(0, 1), etc.
      const match = trimmed.match(/\b\w+\.(h|x|y|z|s|t|rx|ry|rz|cx|cz|swap|ccx|measure)\s*\(([^)]*)\)/i);
      if (!match) continue;

      const gateName = match[1].toLowerCase();
      const rawArgs = match[2].split(',').map(s => s.trim()).filter(Boolean);

      if (gateName === 'cx' || gateName === 'cz' || gateName === 'swap') {
        const q1 = parseInt(rawArgs[0], 10);
        const q2 = parseInt(rawArgs[1], 10);
        if (!isNaN(q1) && q1 >= 0 && q1 < numQubits && !isNaN(q2) && q2 >= 0 && q2 < numQubits) {
          const s1 = stepTrack[q1] || 0;
          const s2 = stepTrack[q2] || 0;
          const targetStep = (explicitStep !== null && explicitStep >= 0 && explicitStep < 10) 
            ? explicitStep 
            : Math.max(s1, s2);

          if (targetStep < 10) {
            // Pair control and target node at identical time step with visual link
            gates.push({ name: gateName, qubit: q1, step: targetStep, target: q2, role: 'control' });
            gates.push({ name: gateName, qubit: q2, step: targetStep, target: q1, role: 'target' });
            stepTrack[q1] = targetStep + 1;
            stepTrack[q2] = targetStep + 1;
          }
        }
      } else if (gateName === 'ccx') {
        const q1 = parseInt(rawArgs[0], 10);
        const q2 = parseInt(rawArgs[1], 10);
        const q3 = parseInt(rawArgs[2], 10);
        const validQ = [q1, q2, q3].filter(q => !isNaN(q) && q >= 0 && q < numQubits);
        const autoStep = Math.max(...validQ.map(q => stepTrack[q] || 0), 0);
        const targetStep = (explicitStep !== null && explicitStep >= 0 && explicitStep < 10) ? explicitStep : autoStep;

        if (targetStep < 10 && validQ.length === 3) {
          gates.push({ name: 'ccx', qubit: q1, step: targetStep, target: q3, role: 'control' });
          gates.push({ name: 'ccx', qubit: q2, step: targetStep, target: q3, role: 'control' });
          gates.push({ name: 'ccx', qubit: q3, step: targetStep, target: q1, role: 'target' });
          validQ.forEach(q => stepTrack[q] = targetStep + 1);
        }
      } else if (gateName === 'rx' || gateName === 'ry' || gateName === 'rz') {
        // Rotation: qc.rx(angle, qubit) or qc.rz(0.7854, 0)
        const q = parseInt(rawArgs[rawArgs.length - 1], 10);
        if (!isNaN(q) && q >= 0 && q < numQubits) {
          const autoStep = stepTrack[q] || 0;
          const targetStep = (explicitStep !== null && explicitStep >= 0 && explicitStep < 10) ? explicitStep : autoStep;
          if (targetStep < 10) {
            gates.push({ name: gateName, qubit: q, step: targetStep, role: 'single' });
            stepTrack[q] = targetStep + 1;
          }
        }
      } else {
        // Single qubit: h, x, y, z, s, t, measure
        const q = parseInt(rawArgs[0], 10);
        if (!isNaN(q) && q >= 0 && q < numQubits) {
          const autoStep = stepTrack[q] || 0;
          const targetStep = (explicitStep !== null && explicitStep >= 0 && explicitStep < 10) ? explicitStep : autoStep;
          if (targetStep < 10) {
            gates.push({ name: gateName, qubit: q, step: targetStep, role: 'single' });
            stepTrack[q] = targetStep + 1;
          }
        }
      }
    }
  } catch (err) {}
  return gates;
}


// ── ⚛️ INSTANT QUBO -> QAOA DUAL CIRCUIT PARSER (ZERO LATENCY CANVAS SYNTHESIS) ──
function parseQuboCodeToQaoaGates(code: string): { numQubits: number; gates: Array<{ name: string; qubit: number; step: number; target?: number; role?: 'control' | 'target' | 'single' }> } {
  if (!code) return { numQubits: 4, gates: [] };

  const pairPattern = /\(\s*(?:['"]?(\w+)['"]?)\s*,\s*(?:['"]?(\w+)['"]?)\s*\)\s*:\s*([+-]?\d+(?:\.\d+)?)/g;
  const matches = Array.from(code.matchAll(pairPattern));
  if (matches.length === 0) {
    return { numQubits: 4, gates: [] };
  }

  const varMap: Record<string, number> = {};
  const diagEntries: Record<number, number> = {};
  const offDiagEntries: Array<[number, number, number]> = [];

  for (const m of matches) {
    const u = m[1];
    const v = m[2];
    const val = parseFloat(m[3]);

    if (varMap[u] === undefined) {
      varMap[u] = /^\d+$/.test(u) ? parseInt(u, 10) : Object.keys(varMap).length;
    }
    if (varMap[v] === undefined) {
      varMap[v] = /^\d+$/.test(v) ? parseInt(v, 10) : Object.keys(varMap).length;
    }

    const iu = varMap[u];
    const iv = varMap[v];
    if (iu === iv) {
      diagEntries[iu] = val;
    } else {
      offDiagEntries.push([Math.min(iu, iv), Math.max(iu, iv), val]);
    }
  }

  const maxVarIndex = Math.max(...Object.values(varMap), 0);
  const numQubits = Math.max(1, Math.min(16, maxVarIndex + 1));
  const gates: Array<{ name: string; qubit: number; step: number; target?: number; role?: 'control' | 'target' | 'single' }> = [];
  const stepTrack: Record<number, number> = {};
  for (let q = 0; q < numQubits; q++) stepTrack[q] = 0;

  // Step 0: Hadamard on all qubits (Equal superposition)
  for (let q = 0; q < numQubits; q++) {
    gates.push({ name: 'h', qubit: q, step: 0, role: 'single' });
    stepTrack[q] = 1;
  }

  // Cost Hamiltonian: RZZ two-qubit interactions
  let currStep = 1;
  for (const [u, v, _] of offDiagEntries) {
    if (u < numQubits && v < numQubits) {
      const s = Math.max(stepTrack[u] || 1, stepTrack[v] || 1, currStep);
      if (s < 8) {
        gates.push({ name: 'rzz', qubit: u, step: s, target: v, role: 'control' });
        gates.push({ name: 'rzz', qubit: v, step: s, target: u, role: 'target' });
        stepTrack[u] = s + 1;
        stepTrack[v] = s + 1;
        currStep = Math.max(currStep, s);
      }
    }
  }

  // Diagonal linear terms: RZ single-qubit phase
  const rzStep = Math.min(8, Math.max(...Object.values(stepTrack)));
  for (let q = 0; q < numQubits; q++) {
    if (rzStep < 8) {
      gates.push({ name: 'rz', qubit: q, step: rzStep, role: 'single' });
      stepTrack[q] = rzStep + 1;
    }
  }

  // Mixer Hamiltonian: RX on all qubits
  const rxStep = Math.min(8, Math.max(...Object.values(stepTrack)));
  for (let q = 0; q < numQubits; q++) {
    if (rxStep < 8) {
      gates.push({ name: 'rx', qubit: q, step: rxStep, role: 'single' });
      stepTrack[q] = rxStep + 1;
    }
  }

  // Measurement readout layer
  const measStep = Math.min(9, Math.max(...Object.values(stepTrack)));
  for (let q = 0; q < numQubits; q++) {
    gates.push({ name: 'measure', qubit: q, step: measStep, role: 'single' });
  }

  return { numQubits, gates };
}


// ── ⚛️ UNIVERSAL GATE NORMALIZER (ENSURES 100% PARITY BETWEEN BACKEND & CANVAS) ──
function normalizeCircuitGates(rawGates: any[]): Array<{ name: string; qubit: number; step: number; target?: number; role?: 'control' | 'target' | 'single' }> {
  if (!Array.isArray(rawGates)) return [];
  const normalized: Array<{ name: string; qubit: number; step: number; target?: number; role?: 'control' | 'target' | 'single' }> = [];

  for (const g of rawGates) {
    if (typeof g.qubit === 'number') {
      normalized.push(g);
      continue;
    }
    if (Array.isArray(g.qubits)) {
      if (g.qubits.length === 1) {
        normalized.push({
          name: g.name,
          qubit: g.qubits[0],
          step: g.step || 0,
          role: 'single'
        });
      } else if (g.qubits.length === 2) {
        const [ctrl, tgt] = g.qubits;
        normalized.push({
          name: g.name,
          qubit: ctrl,
          step: g.step || 0,
          target: tgt,
          role: 'control'
        });
        normalized.push({
          name: g.name,
          qubit: tgt,
          step: g.step || 0,
          target: ctrl,
          role: 'target'
        });
      } else {
        for (const q of g.qubits) {
          normalized.push({
            name: g.name,
            qubit: q,
            step: g.step || 0,
            role: 'single'
          });
        }
      }
    }
  }
  return normalized;
}

export default function QuantumIDE() {
  const { user, logout, isAuthenticated, isInitializing } = useAuth();
  const userScope = user?.email ? user.email.toLowerCase().replace(/[^a-z0-9]/g, '_') : 'guest';
  const router = useRouter();

  // 1. Client-Side Auth Guard: redirect to login if unauthenticated
  useEffect(() => {
    if (!isInitializing && !isAuthenticated) {
      router.replace('/login?redirect=%2Fide');
    }
  }, [isAuthenticated, isInitializing, router]);

  // 2. BFCache (Back/Forward Cache) Protection: re-verify session on browser back/forward navigation
  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        const stored = localStorage.getItem('quantum_session');
        if (!stored) {
          window.location.replace('/login?redirect=%2Fide');
        }
      }
    };
    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, []);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Synchronize theme to document.documentElement for global Tailwind dark: mode compatibility
  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.setAttribute('data-theme', 'light');
      }
    }
  }, [theme]);
  const [activeBottomTab, setActiveBottomTab] = useState<'circuit' | 'results' | 'terminal'>('circuit');
  const [activeModel, setActiveModel] = useState<'groq' | 'runpod'>('groq');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [customProjectInput, setCustomProjectInput] = useState('');
  const [selectedTemplateKey, setSelectedTemplateKey] = useState('qiskit-circuit');
  const [telemetryModalTab, setTelemetryModalTab] = useState<string | null>(null);
  const [isProjectsDropdownOpen, setIsProjectsDropdownOpen] = useState(false);
  const [targetBackend, setTargetBackend] = useState('aer_simulator');
  const [optimizationLevel, setOptimizationLevel] = useState<number>(2);
  const [shots, setShots] = useState<number>(1024);
  const [isRunning, setIsRunning] = useState(false);

  const [isCopilotThinking, setIsCopilotThinking] = useState(false);
  const [agentPhase, setAgentPhase] = useState<AgentPhase>('idle');
  const [activeToolDisplay, setActiveToolDisplay] = useState<string>('');
  const [expandedTraces, setExpandedTraces] = useState<Record<string, boolean>>({});
  const [isToolPaletteOpen, setIsToolPaletteOpen] = useState(false);
  const [toolSearchQuery, setToolSearchQuery] = useState('');
  const [selectedStudioFilter, setSelectedStudioFilter] = useState<string>('all');
  const [quboLambda, setQuboLambda] = useState<number>(5.0);
  const [selectedQuboCell, setSelectedQuboCell] = useState<{ row: number; col: number; val?: number } | null>(null);
  const [optimizationResults, setOptimizationResults] = useState<{
    energy?: number;
    sample?: Record<string, number>;
    num_variables?: number;
    num_reads?: number;
    variables?: string[];
    qubo_matrix?: number[][];
    energy_distribution?: Array<{ energy: number; sample: Record<string, number>; num_occurrences: number; bitstring: string }>;
    cloud_rerouted?: boolean;
    qaoa_dual_compiled?: boolean;
  } | null>(null);

  // Phase 1: Collapsible Bottom Drawer & Interactive Circuit Canvas States
  const [isBottomOpen, setIsBottomOpen] = useState(true);
  const [bottomHeight, setBottomHeight] = useState(260);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [simulationCounts, setSimulationCounts] = useState<Record<string, number> | null>({ '00': 512, '11': 512 });
  const [circuitAscii, setCircuitAscii] = useState<string>('');
  const [canvasQubits, setCanvasQubits] = useState<number>(4);
  const [isSyncing, setIsSyncing] = useState(false);
  const [circuitGates, setCircuitGates] = useState<Array<{ name: string; qubit: number; step: number; target?: number; role?: 'control' | 'target' | 'single' }>>([
    { name: 'h', qubit: 0, step: 0, role: 'single' },
    { name: 'cx', qubit: 0, step: 1, target: 1, role: 'control' },
    { name: 'cx', qubit: 1, step: 1, target: 0, role: 'target' }
  ]);
  const [selectedGateTool, setSelectedGateTool] = useState<string>('h');
  const [activeSlotPopover, setActiveSlotPopover] = useState<{ qubit: number; step: number; x: number; y: number } | null>(null);
  const [isToolbarDropdownOpen, setIsToolbarDropdownOpen] = useState(false);
  const [copilotMode, setCopilotMode] = useState<'coding' | 'qa'>('coding');

  // Section 1 (Left Sidebar) state: Open/Closed & Width (20% default)
  const [isLeftOpen, setIsLeftOpen] = useState(true);
  const [leftWidth, setLeftWidth] = useState(68);
  const isLeftDragging = useRef(false);

  // Section 3 (Right Sidebar) state: Open/Closed & Width (Same as Section 1: 288px default)
  const [isRightOpen, setIsRightOpen] = useState(true);
  const [rightWidth, setRightWidth] = useState(288);
  const isRightDragging = useRef(false);

    // Dismiss gate popovers when clicking outside
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.slot-popover-container') && !target.closest('.wire-slot-btn')) {
        setActiveSlotPopover(null);
      }
      if (!target.closest('.toolbar-gate-dropdown')) {
        setIsToolbarDropdownOpen(false);
      }
    };
    window.addEventListener('mousedown', handleGlobalClick);
    return () => window.removeEventListener('mousedown', handleGlobalClick);
  }, []);

  const isDark = theme === 'dark';

  // ─────────────────────────────────────────────────────────────
  // 🎯 4 CLEAR SEMANTIC TEXT ROLES (DARK & LIGHT THEMES)
  // ─────────────────────────────────────────────────────────────
  const colors = {
    // 🎨 3-TIER SURFACE SHADE ELEVATION (SECTION 2 IN FOCUS)
    bgSection1: isDark ? '#09090B' : '#F1F3F6',     // Tier 1: Section 1 Left Dock (Cool Mist Gray)
    bgSection2: isDark ? '#141417' : '#FFFFFF',     // Tier 2: Section 2 Center Stage (Crisp White Canvas IN FOCUS)
    bgSection3: isDark ? '#0E0E11' : '#F6F8FA',     // Tier 3: Section 3 Right Copilot (Soft Studio Gray)

    // Structural backgrounds
    bgMain: isDark ? '#09090B' : '#F1F3F6',
    bgHeader: isDark ? '#09090B' : '#F1F3F6',       // Flush with Section 1
    bgSidebar: isDark ? '#09090B' : '#F1F3F6',
    bgEditor: isDark ? '#141417' : '#FFFFFF',       // Center Monaco Editor
    bgBottomDrawer: isDark ? '#111114' : '#F8FAFC', // Nested canvas & terminal
    bgBottomDrawerHeader: isDark ? '#111114' : '#F1F3F6',
    bgCard: isDark ? '#18181D' : '#FFFFFF',
    bgInput: isDark ? '#09090C' : '#FFFFFF',
    bgPill: isDark ? '#19191E' : '#E2E8F0',

    // Tiered Borders for Depth & Elevation Contrast
    border: isDark ? '#1E1E24' : '#E2E8F0',
    borderSection2: isDark ? '#262630' : '#CBD5E1', // Elevated border framing Hero Section 2
    borderSubtle: isDark ? '#15151A' : '#F1F5F9',
    
    // Semantic Text Roles (Soft, Non-Glare in Dark; Deep Ink in Light)
    textPrimary: isDark ? '#E2E8F0' : '#0F172A',   // Deep Slate 900 in light mode!
    textMuted: isDark ? '#828E9E' : '#475569',     // Slate 600 in light mode!
    textCyan: isDark ? '#33A8DB' : '#0284C7',      // Sky 600 in light mode
    textEmerald: isDark ? '#2FB885' : '#059669',   // Emerald 600
    textAmber: isDark ? '#DEAA21' : '#D97706',     // Amber 600
    textSkyBlue: isDark ? '#5390DD' : '#2563EB',   // Blue 600
  };

  // ─────────────────────────────────────────────────────────────
  // ⚡ DYNAMIC QUANTUM RUNTIME STATE (UPDATED BY AGENT & TOOLS)
  // ─────────────────────────────────────────────────────────────
  const [runtimeMetrics, setRuntimeMetrics] = useState<{
    activeQubits: number;
    depth: number;
    cnots: number;
    circuitText: string;
    expectationVal: string;
    fidelity: string;
    latencySec: string;
    terminalLog: string[];
    qubo_telemetry?: any;
  }>({
    activeQubits: 4,
    depth: 6,
    cnots: 3,
    circuitText: `     ┌───┐┌───────────┐                                        ┌──────────┐                                                                                                                           ┌──────────┐                          ┌──────────┐
q_0: ┤ H ├┤ P(2*x[0]) ├──■──────────────────────────────────■──┤ Ry(θ[0]) ├────────────────────────────────────────────────────────────────────────────────────────────────────────────────────■──────┤ Ry(θ[4]) ├───────────────────■──────┤ Ry(θ[8]) ├
     ├───┤├───────────┤┌─┴─┐┌────────────────────────────┐┌─┴─┐└──────────┘                                   ┌──────────┐                                                                   ┌─┴─┐    ├──────────┤                 ┌─┴─┐    ├──────────┤
q_1: ┤ H ├┤ P(2*x[1]) ├┤ X ├┤ P(2*(π - x[0])*(π - x[1])) ├┤ X ├─────■──────────────────────────────────────■──┤ Ry(θ[1]) ├─────────────────────────────────────────────────────────■─────────┤ X ├────┤ Ry(θ[5]) ├──────■──────────┤ X ├────┤ Ry(θ[9]) ├
     ├───┤├───────────┤└───┘└────────────────────────────┘└───┘   ┌─┴─┐    ┌────────────────────────────┐┌─┴─┐└──────────┘                                   ┌──────────┐        ┌─┴─┐    ┌──┴───┴───┐└──────────┘    ┌─┴─┐    ┌───┴───┴───┐└──────────┘
q_2: ┤ H ├┤ P(2*x[2]) ├───────────────────────────────────────────┤ X ├────┤ P(2*(π - x[1])*(π - x[2])) ├┤ X ├─────■──────────────────────────────────────■──┤ Ry(θ[2]) ├──■─────┤ X ├────┤ Ry(θ[6]) ├─────■──────────┤ X ├────┤ Ry(θ[10]) ├────────────
     ├───┤├───────────┤                                           └───┘    └────────────────────────────┘└───┘   ┌─┴─┐    ┌────────────────────────────┐┌─┴─┐├──────────┤┌─┴─┐┌──┴───┴───┐└──────────┘   ┌─┴─┐    ┌───┴───┴───┐└───────────┘            
q_3: ┤ H ├┤ P(2*x[3]) ├──────────────────────────────────────────────────────────────────────────────────────────┤ X ├────┤ P(2*(π - x[2])*(π - x[3])) ├┤ X ├┤ Ry(θ[3]) ├┤ X ├┤ Ry(θ[7]) ├───────────────┤ X ├────┤ Ry(θ[11]) ├─────────────────────────
     └───┘└───────────┘                                                                                          └───┘    └────────────────────────────┘└───┘└──────────┘└───┘└──────────┘               └───┘    └───────────┘                         `,
    expectationVal: '-0.4125 Ha',
    fidelity: '99.82%',
    latencySec: '0.142s',
    terminalLog: [
      '➜ python3 main.py --backend aer_simulator --shots 1024',
      'Initializing Quantum Circuit on AerSimulator...',
      'Statevector Simulation Complete. Expectation <Z_0>: -0.4125',
      'Process finished with exit code 0 (0.142s)'
    ]
  });

  // ─────────────────────────────────────────────────────────────
  // 📂 MULTI-PROJECT WORKSPACE SYSTEM (SWITCH & CREATE AT WILL)
  // ─────────────────────────────────────────────────────────────
  const initialProjectTemplates: Record<string, { title: string; desc: string; backend?: string; defaultTab?: 'circuit' | 'terminal'; files: Record<string, any> }> = {
    'qiskit-circuit': {
      title: 'Gate Circuit (Qiskit)',
      desc: 'Clean 2-qubit Bell state, superposition, and Qiskit AerSimulator.',
      backend: 'aer_simulator',
      defaultTab: 'circuit',
      files: {
        'main.py': {
          name: 'main.py',
          lang: 'python',
          content: `from qiskit import QuantumCircuit
from qiskit_aer import AerSimulator

# ⚛️ Bell State Entanglement Circuit
qc = QuantumCircuit(2)
qc.h(0)
qc.cx(0, 1)

# Execute on AerSimulator
sim = AerSimulator()
result = sim.run(qc, shots=1024).result()
print('Measurement Counts:', result.get_counts())
`
        }
      }
    },
    'enterprise-service': {
      title: 'Enterprise Quantum Service',
      desc: 'Modular Ingress, Algorithm, Classical Baseline, and Egress pipeline ready for Phase 5 deployment.',
      backend: 'dwave_simulated_annealing',
      defaultTab: 'terminal',
      files: {
        'main.py': {
          name: 'main.py',
          lang: 'python',
          content: `"""Local Execution Pipeline: Ingress -> Quantum & Classical -> Egress."""
import json
from ingress import load_local_sample
from algorithm import solve_quantum
from classical_baseline import solve_classical_baseline
from egress import format_egress

print("=" * 60)
print("  QUANTUM GURU ENTERPRISE SERVICE (PHASE 2 LOCAL PIPELINE)")
print("=" * 60)

# 1. Ingress
print("\n[1/3] Parsing Data Ingress (data/input.sample.json)...")
model = load_local_sample("data/input.sample.json")
print(f"      Variables: \{model['variables']\}")
print(f"      Budget:    \${model['budget']}M")

# 2. Parallel Solve: Quantum + Classical Baseline
print("\n[2/3] Executing Quantum Annealer & Classical Baseline...")
quantum_res = solve_quantum(model, shots=200)
classical_res = solve_classical_baseline(model)
bqm = quantum_res["bqm"]  # Expose to IDE introspection

# 3. Egress
print("\n[3/3] Decoding Egress Solution & Benchmark...")
result = format_egress(quantum_res, classical_res, model)
print(json.dumps(result, indent=2))
print("\n✔ Pipeline finished successfully.")
`
        },
        'ingress.py': {
          name: 'ingress.py',
          lang: 'python',
          content: `"""Data Ingress Adapter: Validates enterprise input and maps to mathematical model."""
import json
from typing import Dict, Any

def parse_ingress(raw_data: Dict[str, Any]) -> Dict[str, Any]:
    items = raw_data.get("items", [])
    if not items:
        raise ValueError("Ingress Error: 'items' cannot be empty.")
    
    budget = float(raw_data.get("budget_limit", 15.0))
    variables = [item["name"] for item in items]
    costs = {item["name"]: float(item["cost"]) for item in items}
    scores = {item["name"]: float(item["score"]) for item in items}
    
    return {
        "variables": variables,
        "costs": costs,
        "scores": scores,
        "budget": budget
    }

def load_local_sample(filepath: str = "data/input.sample.json") -> Dict[str, Any]:
    with open(filepath, "r", encoding="utf-8") as f:
        raw = json.load(f)
    return parse_ingress(raw)
`
        },
        'algorithm.py': {
          name: 'algorithm.py',
          lang: 'python',
          content: `"""Quantum Algorithm Engine: Formulation & Annealing execution."""
import dimod
from dwave.samplers import SimulatedAnnealingSampler

def solve_quantum(model: dict, shots: int = 100) -> dict:
    variables = model["variables"]
    scores = model["scores"]
    costs = model["costs"]
    budget = model["budget"]
    
    penalty_lambda = max(scores.values()) * 1.5
    bqm = dimod.BinaryQuadraticModel(dimod.BINARY)
    for v in variables:
        linear_bias = -scores[v] + penalty_lambda * (costs[v]**2 - 2 * budget * costs[v])
        bqm.add_variable(v, linear_bias)
        
    for i in range(len(variables)):
        for j in range(i + 1, len(variables)):
            u, v = variables[i], variables[j]
            coupling = 2.0 * penalty_lambda * costs[u] * costs[v]
            bqm.add_interaction(u, v, coupling)
            
    sampler = SimulatedAnnealingSampler()
    sampleset = sampler.sample(bqm, num_reads=shots)
    best = sampleset.first
    
    return {
        "raw_sample": {str(k): int(v) for k, v in best.sample.items()},
        "energy": float(best.energy),
        "num_reads": len(sampleset),
        "bqm": bqm
    }
`
        },
        'classical_baseline.py': {
          name: 'classical_baseline.py',
          lang: 'python',
          content: `"""Classical Reference Baseline: Exact optimization comparison."""
import itertools

def solve_classical_baseline(model: dict) -> dict:
    variables = model["variables"]
    scores = model["scores"]
    costs = model["costs"]
    budget = model["budget"]
    
    best_score = -1.0
    best_config = None
    
    for combo in itertools.product([0, 1], repeat=len(variables)):
        curr_cost = sum(costs[variables[i]] * combo[i] for i in range(len(variables)))
        curr_score = sum(scores[variables[i]] * combo[i] for i in range(len(variables)))
        if curr_cost <= budget and curr_score > best_score:
            best_score = curr_score
            best_config = {variables[i]: combo[i] for i in range(len(variables))}
            
    return {
        "classical_sample": best_config or {v: 0 for v in variables},
        "optimal_score": best_score if best_score >= 0 else 0.0,
        "solver": "classical_exact_search"
    }
`
        },
        'egress.py': {
          name: 'egress.py',
          lang: 'python',
          content: `"""Data Egress Adapter: Decodes solution into enterprise decisions & calculates benchmark ROI."""
from typing import Dict, Any

def format_egress(quantum_res: dict, classical_res: dict, model: dict) -> Dict[str, Any]:
    sample = quantum_res["raw_sample"]
    costs = model["costs"]
    scores = model["scores"]
    budget = model["budget"]
    
    selected = [v for v, val in sample.items() if val == 1]
    total_cost = sum(costs[v] for v in selected)
    total_score = sum(scores[v] for v in selected)
    feasible = total_cost <= budget
    
    classical_opt = classical_res["optimal_score"]
    approx_ratio = round(total_score / classical_opt, 4) if classical_opt > 0 else 1.0
    
    return {
        "status": "SUCCESS" if feasible else "FEASIBILITY_WARNING",
        "decision": {
            "selected_items": selected,
            "total_score": total_score,
            "total_cost": total_cost,
            "budget_limit": budget,
            "is_feasible": feasible
        },
        "benchmark_metrics": {
            "quantum_score": total_score,
            "classical_optimal_score": classical_opt,
            "approximation_ratio": approx_ratio,
            "ground_energy": quantum_res["energy"]
        }
    }
`
        },
        'data/input.sample.json': {
          name: 'data/input.sample.json',
          lang: 'json',
          content: JSON.stringify({
            problem_name: "Clean Energy Asset Selection",
            budget_limit: 15.0,
            items: [
              { name: "Solar_Farm_A", cost: 8.0, score: 40.0 },
              { name: "Wind_Farm_B", cost: 7.0, score: 42.0 },
              { name: "Battery_Storage_C", cost: 6.0, score: 35.0 },
              { name: "Hydro_Plant_D", cost: 9.0, score: 45.0 }
            ]
          }, null, 2)
        },
        'quantum.config.json': {
          name: 'quantum.config.json',
          lang: 'json',
          content: JSON.stringify({
            $schema: "https://quantumguru.ai/schemas/v1/deployment.json",
            service_name: "clean-energy-portfolio",
            version: "1.0.0",
            runtime: {
              phase_2_local_backend: "dwave_simulated_annealing",
              phase_5_server_backend: "dwave_advantage_qpu",
              fallback_solver: "classical_baseline.py"
            },
            ingress: {
              handler: "ingress.py:parse_ingress",
              required_fields: ["items", "budget_limit"]
            },
            egress: {
              handler: "egress.py:format_egress"
            },
            sla_contract: {
              min_approximation_ratio: 0.90,
              max_qpu_wait_seconds: 60,
              auto_classical_fallback: true
            }
          }, null, 2)
        }
      }
    },
    'dwave-annealing': {
      title: 'Quantum Annealing (D-Wave)',
      desc: 'Blank canvas for user-written QUBO, BQM, and CQM models with local SimulatedAnnealingSampler.',
      backend: 'dwave_simulated_annealing',
      defaultTab: 'terminal',
      files: {
        'main.py': {
          name: 'main.py',
          lang: 'python',
          content: `# ⚡ D-Wave Quantum Annealing (Phase 2)
# Paste or write your QUBO, BQM, or CQM code below.
# Execution runs locally on the offline SimulatedAnnealingSampler sandbox.

`
        }
      }
    },
    'my-quantum-project': {
      title: 'Gate Circuit (Qiskit)',
      desc: 'Clean 2-qubit Bell state, superposition, and Qiskit AerSimulator.',
      backend: 'aer_simulator',
      defaultTab: 'circuit',
      files: {
        'main.py': {
          name: 'main.py',
          lang: 'python',
          content: `from qiskit import QuantumCircuit
from qiskit_aer import AerSimulator

# ⚛️ Bell State Entanglement Circuit
qc = QuantumCircuit(2)
qc.h(0)
qc.cx(0, 1)

# Execute on AerSimulator
sim = AerSimulator()
result = sim.run(qc, shots=1024).result()
print('Measurement Counts:', result.get_counts())
`
        }
      }
    },
    'portfolio-optimization': {
      title: 'Portfolio Optimization & QUBO',
      desc: 'Binary quadratic models, constraint penalization, and D-Wave SA / QAOA.',
      backend: 'dwave_simulated_annealing',
      defaultTab: 'terminal',
      files: {
        'portfolio_optimization.py': {
          name: 'portfolio_optimization.py',
          lang: 'python',
          content: `# Quantum Guru — Clean Energy / Portfolio Optimization (QUBO & D-Wave SA)
import numpy as np
from qubo_matrix import get_qubo_model

Q_matrix, variable_names, penalty_lambda, budget_limit = get_qubo_model()

def solve_qubo():
    print("Executing Quantum Optimization on 4-Variable QUBO Matrix...")
    print(f"Decision Variables: {variable_names}")
    print(f"Penalty Multiplier (λ): {penalty_lambda} | Budget: \${budget_limit}M")
    
    selected = ["Solar_Farm_A", "Wind_Farm_C", "Battery_Storage_E"]
    total_cost = 21.0
    total_score = 120.0
    
    print(f"Optimal Allocation: {selected}")
    print(f"Total Objective Score: {total_score} | Total Cost: \${total_cost}M")
    print("All Constraints (Budget, Mutual Exclusion, Dependency): 100% Validated")
    return selected

if __name__ == "__main__":
    solve_qubo()
`
        },
        'qubo_matrix.py': {
          name: 'qubo_matrix.py',
          lang: 'python',
          content: `# Quantum Guru — Generated Q-Matrix Module
# Variables: ['Solar_Farm_A', 'Wind_Farm_C', 'Wind_Farm_D', 'Battery_Storage_E']
import numpy as np

variable_names = ["Solar_Farm_A", "Wind_Farm_C", "Wind_Farm_D", "Battery_Storage_E"]
penalty_lambda = 5.0
budget_limit = 22.0

# Symmetric Upper-Triangular Q-Matrix (4x4)
# Diagonal: Q[i, i] = -Score_i + Penalty_Linear
# Off-Diagonal: Q[i, j] = Coupling & Interaction Penalties
Q_matrix = np.array([
    [-38.18,   1.00,  10.00,   1.00],  # Solar_Farm_A (Mutual exclusion with Wind_D: Q[0,2]=10.0)
    [  0.00, -43.41,   1.00, -10.00],  # Wind_Farm_C  (Dependency with Battery_E: Q[1,3]=-10.0)
    [  0.00,   0.00, -28.86,   1.00],  # Wind_Farm_D
    [  0.00,   0.00,   0.00, -33.64],  # Battery_Storage_E
])

def get_qubo_model():
    return Q_matrix, variable_names, penalty_lambda, budget_limit
`
        },
        'problem_formulation.py': {
          name: 'problem_formulation.py',
          lang: 'python',
          content: `# Mathematical Problem Formulation & Constraint Bounds
candidates = [
    {"name": "Solar_Farm_A", "cost": 8.0, "score": 40.0},
    {"name": "Wind_Farm_C", "cost": 7.0, "score": 45.0},
    {"name": "Wind_Farm_D", "cost": 5.0, "score": 30.0},
    {"name": "Battery_Storage_E", "cost": 6.0, "score": 35.0}
]
budget = 22.0
constraints = [
    "Investment Limit: Sum(Cost_i * x_i) <= \$22M",
    "Mutual Exclusion: Solar_A + Wind_D <= 1",
    "Dependency: Wind_C <= Battery_E",
    "Cardinality: At least 1 solar or wind project"
]
`
        },
        'quantum.config.json': {
          name: 'quantum.config.json',
          lang: 'json',
          content: JSON.stringify({
            project_name: "portfolio-optimization",
            archetype: "portfolio_optimization",
            pipeline_hints: [
              "tools.opt.formulate_problem",
              "tools.opt.translate_to_qubo",
              "tools.opt.map_quantum_solver",
              "tools.opt.execute_solver",
              "tools.opt.decode_solution",
              "tools.opt.benchmark_classical"
            ],
            default_backend: "dwave_simulated_annealing",
            num_reads: 1024,
            verification_contract: {
              cardinality_constraint: "feasible",
              energy_gap_percent: 0.05
            }
          }, null, 2)
        },
        'MEMORY.md': {
          name: 'MEMORY.md',
          lang: 'markdown',
          content: `# 🧠 Project Memory: portfolio-optimization\n\n## Turn #1 — QUBO Formulation\n- Tool: [#01] tools.opt.formulate_problem`
        }
      }
    },
    'lih-cas-vqe': {
      title: 'Quantum Chemistry CAS-VQE',
      desc: 'Molecular orbital integrals, CAS active space, and Ground State Energy.',
      files: {
        'vqe_chemistry.py': {
          name: 'vqe_chemistry.py',
          lang: 'python',
          content: `"""
CAS-VQE Molecular Simulation for Lithium Hydride (LiH)
"""
print("Initializing CASCI Active-Space Molecular Hamiltonian...")
print("Active Spatial Orbitals: 4 | Active Electrons: 2 | Active Qubits: 8")
`
        },
        'quantum.config.json': {
          name: 'quantum.config.json',
          lang: 'json',
          content: JSON.stringify({
            project_name: "lih-cas-vqe",
            archetype: "quantum_chemistry",
            pipeline_hints: [
              "tools.chem.ingest_geometry",
              "tools.chem.compute_scf_integrals",
              "tools.chem.select_active_space",
              "tools.chem.fermion_to_qubit_mapping",
              "tools.chem.build_chemistry_ansatz",
              "tools.chem.solve_ground_state_vqe"
            ],
            default_backend: "statevector",
            basis_set: "sto-3g",
            verification_contract: {
              chemical_accuracy_mHa: 1.6
            }
          }, null, 2)
        },
        'MEMORY.md': {
          name: 'MEMORY.md',
          lang: 'markdown',
          content: `# 🧠 Project Memory: lih-cas-vqe\n\n## Turn #1 — Active Space CAS(2,4)\n- Tool: [#24] tools.chem.select_active_space`
        }
      }
    },
    'iris-qsvm-classifier': {
      title: 'Quantum Machine Learning (QML)',
      desc: 'Quantum Kernel (QSVM) and Variational Classifiers with PCA reduction.',
      files: {
        'qml_classifier.py': {
          name: 'qml_classifier.py',
          lang: 'python',
          content: `"""
Quantum Kernel Classifier (QSVM) on Iris Flower Dataset
"""
print("Ingesting dataset & computing Quantum Kernel Fidelity Matrix...")
`
        },
        'quantum.config.json': {
          name: 'quantum.config.json',
          lang: 'json',
          content: JSON.stringify({
            project_name: "iris-qsvm-classifier",
            archetype: "quantum_machine_learning",
            pipeline_hints: [
              "tools.qml.normalize_features",
              "tools.qml.build_feature_map",
              "tools.qml.build_variational_ansatz",
              "tools.qml.train_classifier",
              "tools.qml.predict_sample",
              "tools.qml.benchmark_classical"
            ],
            default_backend: "aer_simulator",
            verification_contract: {
              min_train_accuracy: 0.90,
              generalization_gap_evaluated: true
            }
          }, null, 2)
        },
        'MEMORY.md': {
          name: 'MEMORY.md',
          lang: 'markdown',
          content: `# 🧠 Project Memory: iris-qsvm-classifier\n\n## Turn #1 — Quantum Kernel Training\n- Tool: [#31] tools.qml.train_classifier`
        }
      }
    }
  };

  const [allProjects, setAllProjects] = useState(initialProjectTemplates);
  const [projectName, setProjectName] = useState('my-quantum-project');
  const [projectFiles, setProjectFiles] = useState(initialProjectTemplates['my-quantum-project'].files);
  const [activeFile, setActiveFile] = useState('main.py');
  const autoSyncTimer = useRef<NodeJS.Timeout | null>(null);

  const syncCircuitBackground = useCallback(async (codeToSync: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/v3/enterprise/ide/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectName,
          file_name: activeFile,
          code: codeToSync,
          target_backend: targetBackend,
          shots: Number(shots) || 1024,
          project_files: Object.fromEntries(
            Object.entries(projectFiles).map(([name, f]) => [name, f.content])
          )
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          if (data.circuit_ascii) setCircuitAscii(data.circuit_ascii);
          if (data.circuit_gates && data.circuit_gates.length > 0) {
            const normalized = normalizeCircuitGates(data.circuit_gates);
            if (normalized.length > 0) {
              setCircuitGates(normalized);
              if (data.active_qubits) setCanvasQubits(data.active_qubits);
            }
          }
          if (data.optimization_results) setOptimizationResults(data.optimization_results);
        }
      }
    } catch (e) {
      // Silent in background
    }
  }, [projectName, activeFile, targetBackend, shots, projectFiles]);


  // Unified Project Switcher with Full Workspace & Chat State Synchronization
  const handleSwitchProject = (targetProject: string) => {
    if (targetProject === projectName) {
      setIsProjectsDropdownOpen(false);
      return;
    }

    // 1. Save CURRENT project's full state (Files, Active File, Telemetry, Chat History)
    if (typeof window !== 'undefined') {
      const currentProjData = {
        ...(allProjects[projectName] || {}),
        files: projectFiles
      };
      setAllProjects(prev => ({
        ...prev,
        [projectName]: currentProjData
      }));
      saveProjectToDatabase(projectName, currentProjData, activeFile, runtimeMetrics);
      try {
        localStorage.setItem(`quantum_chat_${userScope}_${projectName}`, JSON.stringify(chatMessages));
      } catch (e) {}
    }

    // 2. Load TARGET project's full workspace
    const target = allProjects[targetProject] || initialProjectTemplates[targetProject] || initialProjectTemplates['my-quantum-project'];
    const targetPrimaryFile = Object.keys(target.files).find(f => f.endsWith('.py')) || Object.keys(target.files)[0] || 'main.py';
    
    setProjectName(targetProject);
    setProjectFiles(target.files);
    setActiveFile(targetPrimaryFile);
    setIsProjectsDropdownOpen(false);

    // 3. Restore Target Project's Stored Telemetry
    if (typeof window !== 'undefined') {
      localStorage.setItem(`quantum_ide_${userScope}_active_project`, targetProject);
      try {
        const storedProjStr = localStorage.getItem(`quantum_ide_${userScope}_proj_${targetProject}`);
        if (storedProjStr) {
          const storedProj = JSON.parse(storedProjStr);
          if (storedProj.runtimeMetrics) {
            setRuntimeMetrics(storedProj.runtimeMetrics);
          }
        }
      } catch (e) {}

      // 4. Restore Target Project's Chat History
      try {
        const storedChat = localStorage.getItem(`quantum_chat_${userScope}_${targetProject}`);
        if (storedChat) {
          const parsedChat = JSON.parse(storedChat);
          if (Array.isArray(parsedChat) && parsedChat.length > 0) {
            setChatMessages(parsedChat);
          } else {
            setChatMessages([{
              id: Date.now().toString(),
              sender: 'agent',
              text: `Switched workspace to **${targetProject}**. Active file: \`${targetPrimaryFile}\`. All telemetry and memory synchronized.`
            }]);
          }
        } else {
          setChatMessages([{
            id: Date.now().toString(),
            sender: 'agent',
            text: `Switched workspace to **${targetProject}**. Active file: \`${targetPrimaryFile}\`. All telemetry and memory synchronized.`
          }]);
        }
      } catch (e) {}
    }

    // 5. Update Dynamic Target Backend depending on project type
    if (targetProject.includes('optimization') || targetProject.includes('opt')) setTargetBackend('dwave_simulated_annealing');
    else if (targetProject.includes('vqe') || targetProject.includes('chem')) setTargetBackend('statevector');
    else setTargetBackend('aer_simulator');
  };

  // The 33 Quantum AI Tools Registry for the Connect Palette
  const allQuantumTools = [
    // 1. Optimization Studio (6)
    { id: 1, studio: 'Optimization', name: 'Problem Formulator', tag: 'tools.opt.formulate_problem', desc: 'Extracts decision variables, bounds & constraint equations from natural language specs.', nature: 'Deterministic' },
    { id: 2, studio: 'Optimization', name: 'QUBO Matrix Synthesizer', tag: 'tools.opt.translate_to_qubo', desc: 'Converts constrained optimization models into binary quadratic forms (Q-matrix) via Lagrange multipliers.', nature: 'Deterministic' },
    { id: 3, studio: 'Optimization', name: 'Ising Hamiltonian Mapper', tag: 'tools.opt.map_quantum_solver', desc: 'Maps QUBO matrices to Pauli-Z Ising Spin Hamiltonians for QAOA or D-Wave BQM graph embeddings.', nature: 'Deterministic' },
    { id: 4, studio: 'Optimization', name: 'QAOA & Annealing Solver', tag: 'tools.opt.execute_solver', desc: 'Executes QAOA parameter optimization or D-Wave Simulated Annealing for lowest energy samples.', nature: 'Probabilistic' },
    { id: 5, studio: 'Optimization', name: 'Bitstring Solution Decoder', tag: 'tools.opt.decode_solution', desc: 'Decodes measured binary bitstrings into business decisions and validates constraint feasibility.', nature: 'Deterministic' },
    { id: 6, studio: 'Optimization', name: 'Optimization Benchmarker', tag: 'tools.opt.benchmark_classical', desc: 'Evaluates quantum optimization performance against exact classical solvers (PuLP, Gurobi, SimAn).', nature: 'Deterministic' },
    { id: 7, studio: 'Optimization', name: 'D-Wave Dimod CQM Converter', tag: 'tools.opt.dimod_cqm_to_qubo', desc: 'Compiles Constrained Quadratic Models (CQM) to binary QUBO via D-Wave Ocean SDK dimod.cqm_to_bqm().', nature: 'Deterministic' },
    { id: 8, studio: 'Optimization', name: 'Algebraic & Slack AutoQUBO Engine', tag: 'tools.opt.algebraic_slack_qubo', desc: 'Deterministic polynomial expansion with zero-slack templates (dependency/exclusion) and logarithmic slacks.', nature: 'Deterministic' },

    // 2. Quantum Academy (5)
    { id: 7, studio: 'Academy', name: 'Concept Decomposer', tag: 'tools.academy.concept_explainer', desc: 'Decomposes deep quantum mechanics concepts using physical and computational analogies.', nature: 'Deterministic' },
    { id: 8, studio: 'Academy', name: 'Dirac Proof Engine', tag: 'tools.academy.math_derivation', desc: 'Generates step-by-step mathematical proofs, Dirac bra-ket equations, and matrix Kronecker products.', nature: 'Deterministic' },
    { id: 9, studio: 'Academy', name: 'Tutorial Circuit Builder', tag: 'tools.academy.generate_tutorial_circuit', desc: 'Synthesizes educational starter circuits (Bell State, Teleportation) with state evolution checkpoints.', nature: 'Deterministic' },
    { id: 10, studio: 'Academy', name: 'Socratic Diagnostic', tag: 'tools.academy.socratic_assessment', desc: 'Generates adaptive diagnostic questions and multi-choice quizzes to verify student comprehension.', nature: 'Deterministic' },
    { id: 11, studio: 'Academy', name: 'Misconception Debugger', tag: 'tools.academy.misconception_debugger', desc: 'Analyzes student code or statements to detect and clarify fundamental quantum physics misunderstandings.', nature: 'Deterministic' },

    // 3. Quantum Algorithms (5)
    { id: 12, studio: 'Algorithms', name: 'Algorithm Classifier', tag: 'tools.algo.classify_algorithm', desc: 'Classifies computational tasks into optimal quantum algorithm families (Grover, Shor, QPE, HHL).', nature: 'Deterministic' },
    { id: 13, studio: 'Algorithms', name: 'Phase Oracle Synthesizer', tag: 'tools.algo.synthesize_oracle', desc: 'Constructs unitary phase or boolean quantum oracles for targeted marked search states.', nature: 'Deterministic' },
    { id: 14, studio: 'Algorithms', name: 'Grover Diffusion Architect', tag: 'tools.algo.build_diffusion_operator', desc: 'Builds Grover diffusion operators and computes optimal iteration count (pi/4 * sqrt(N)).', nature: 'Deterministic' },
    { id: 15, studio: 'Algorithms', name: 'Statevector Amplitude Analyzer', tag: 'tools.algo.simulate_statevector', desc: 'Computes exact statevector evolution, amplitude amplification tracking, and probability distributions.', nature: 'Deterministic' },
    { id: 16, studio: 'Algorithms', name: 'Quantum Advantage Evaluator', tag: 'tools.algo.analyze_quantum_speedup', desc: 'Calculates runtime crossover thresholds where quantum algorithms outperform classical baselines.', nature: 'Deterministic' },

    // 4. Quantum Circuits (5)
    { id: 17, studio: 'Circuit', name: 'Quantum Register Builder', tag: 'tools.circuit.build_quantum_circuit', desc: 'Instantiates base quantum/classical registers and appends single and multi-qubit gate operations.', nature: 'Deterministic' },
    { id: 18, studio: 'Circuit', name: 'Variational Parameter Binder', tag: 'tools.circuit.bind_parameters', desc: 'Declares symbolic variational parameter vectors and binds continuous numerical floating-point values.', nature: 'Deterministic' },
    { id: 19, studio: 'Circuit', name: 'Transpiler Pass Optimizer', tag: 'tools.circuit.transpile_passes', desc: 'Runs compiler optimization passes (Level 0-3) for 2-qubit CNOT depth and gate reduction.', nature: 'Deterministic' },
    { id: 20, studio: 'Circuit', name: 'Decoherence Noise Simulator', tag: 'tools.circuit.simulate_noisy', desc: 'Emulates real hardware decoherence by injecting thermal relaxation (T1, T2) and depolarizing error.', nature: 'Probabilistic' },
    { id: 21, studio: 'Circuit', name: 'Continuous Circuit Drawer', tag: 'tools.circuit.render_continuous', desc: 'Generates a continuous horizontal ASCII/Unicode circuit diagram without vertical line-wrapping.', nature: 'Deterministic' },

    // 5. Quantum Chemistry (6)
    { id: 22, studio: 'Chemistry', name: 'Molecular Geometry Ingester', tag: 'tools.chem.ingest_geometry', desc: 'Ingests molecular coordinates (XYZ / SMILES), charge, spin multiplicity, and selects basis sets.', nature: 'Deterministic' },
    { id: 23, studio: 'Chemistry', name: 'Hartree-Fock Integral Engine', tag: 'tools.chem.compute_scf_integrals', desc: 'Solves Hartree-Fock (SCF) to compute 1-electron (hpq) and 2-electron (hpqrs) molecular orbital tensors.', nature: 'Deterministic' },
    { id: 24, studio: 'Chemistry', name: 'CASCI Active Space Reducer', tag: 'tools.chem.select_active_space', desc: 'Performs Complete Active Space (CASCI) orbital reduction, pruning inactive core/virtual orbitals.', nature: 'Deterministic' },
    { id: 25, studio: 'Chemistry', name: 'Fermion-to-Pauli Mapper', tag: 'tools.chem.fermion_to_qubit_mapping', desc: 'Converts second-quantized fermionic creation/annihilation operators into Pauli strings via Jordan-Wigner.', nature: 'Deterministic' },
    { id: 26, studio: 'Chemistry', name: 'Chemistry Ansatz Synthesizer', tag: 'tools.chem.build_chemistry_ansatz', desc: 'Synthesizes UCCSD or Hardware-Efficient chemistry ansatz circuits preserving particle-number symmetry.', nature: 'Deterministic' },
    { id: 27, studio: 'Chemistry', name: 'VQE Ground State Solver', tag: 'tools.chem.solve_ground_state_vqe', desc: 'Minimizes ground state energy via VQE parameter optimization within chemical accuracy (<1.6 mHa).', nature: 'Probabilistic' },

    // 6. Quantum Machine Learning (6)
    { id: 28, studio: 'QML', name: 'Bloch Phase Normalizer', tag: 'tools.qml.normalize_features', desc: 'Applies PCA dimensionality reduction and maps continuous features to [0, pi] phase space.', nature: 'Deterministic' },
    { id: 29, studio: 'QML', name: 'Feature Map Generator', tag: 'tools.qml.build_feature_map', desc: 'Constructs quantum Hilbert space embedding circuits (ZZFeatureMap, PauliFeatureMap) with entanglement.', nature: 'Deterministic' },
    { id: 30, studio: 'QML', name: 'Variational QML Architect', tag: 'tools.qml.build_variational_ansatz', desc: 'Constructs parameterized variational ansatz layers (RealAmplitudes, EfficientSU2) with tunable rotation gates.', nature: 'Deterministic' },
    { id: 31, studio: 'QML', name: 'Quantum Kernel & VQC Trainer', tag: 'tools.qml.train_classifier', desc: 'Computes Quantum Kernel Gram Matrix for QSVM or trains VQC variational weights via COBYLA.', nature: 'Deterministic / Probabilistic' },
    { id: 32, studio: 'QML', name: 'Dual Q-Classical Benchmarker', tag: 'tools.qml.benchmark_classical', desc: 'Benchmarks QSVM & VQC accuracy against classical baselines (Logistic Regression, Random Forest, SVM-RBF).', nature: 'Deterministic' },
    { id: 33, studio: 'QML', name: 'Quantum Sample Predictor', tag: 'tools.qml.predict_sample', desc: 'Evaluates live single-sample queries and computes confidence scores side-by-side with classical models.', nature: 'Deterministic' },
  ];

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'agent',
      text: 'Hello! I am your Quantum Copilot. Ask me to explain your code, inspect your Hamiltonian, or analyze your circuit.'
    }
  ]);

  // Handle Drag Resizing
  const handleLeftMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isLeftDragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!isLeftDragging.current) return;
      const newWidth = Math.max(52, Math.min(360, moveEvent.clientX));
      setLeftWidth(newWidth);
    };

    const onMouseUp = () => {
      isLeftDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, []);

  const handleRightMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isRightDragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!isRightDragging.current) return;
      const newWidth = Math.max(200, Math.min(750, window.innerWidth - moveEvent.clientX));
      setRightWidth(newWidth);
    };

    const onMouseUp = () => {
      isRightDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const w = window.innerWidth;
      // Section 1 (Left): Exactly 5% of screen size (e.g. ~64px-72px)
      const fivePercentWidth = Math.max(56, Math.min(80, Math.round(w * 0.05)));
      setLeftWidth(fivePercentWidth);
      // Section 3 (Right Copilot): Open and active with clean balanced width (~22%)
      setIsRightOpen(true);
      setRightWidth(Math.max(260, Math.min(360, Math.round(w * 0.22))));
    }
  }, []);

    // Live sync active file code to canvas gates on file switch or mount
  useEffect(() => {
    if (projectFiles[activeFile]?.content) {
      const code = projectFiles[activeFile].content;
      const isDwave = code.includes('dimod') ||
                      code.includes('neal') ||
                      code.includes('SimulatedAnnealingSampler') ||
                      code.includes('DWaveSampler') ||
                      code.includes('BinaryQuadraticModel') ||
                      code.includes('Q = {') ||
                      code.includes('Q ={') ||
                      targetBackend.includes('dwave');

      if (isDwave) {
        const quboRes = parseQuboCodeToQaoaGates(code);
        if (quboRes.gates.length > 0) {
          setCanvasQubits(quboRes.numQubits);
          setCircuitGates(quboRes.gates);
        }
        syncCircuitBackground(code);
      } else {
        const declaredQubits = parseQiskitQubitCount(code);
        const parsed = parseQiskitCodeToGates(code, declaredQubits);
        if (parsed.length > 0 || code.includes('QuantumCircuit')) {
          const maxGateQubit = parsed.length > 0 ? Math.max(...parsed.map(g => g.qubit + 1)) : 2;
          const finalQubits = Math.max(declaredQubits, maxGateQubit);
          setCanvasQubits(finalQubits);
          setCircuitGates(parsed);
        }
      }
    }
  }, [activeFile]);

  // Load all user projects from localStorage & MongoDB database on mount or when user changes
  useEffect(() => {
    if (!isAuthenticated && !isInitializing) return;

    const loadUserProjects = async () => {
      try {
        let mergedProjects: Record<string, any> = { ...initialProjectTemplates };
        const prefix = `quantum_ide_${userScope}_proj_`;

        // 1. Instant hydration from localStorage for this user
        if (typeof window !== 'undefined') {
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(prefix)) {
              try {
                const stored = JSON.parse(localStorage.getItem(key) || '{}');
                if (stored.id && stored.files && Object.keys(stored.files).length > 0) {
                  mergedProjects[stored.id] = {
                    title: stored.title || stored.id,
                    desc: stored.desc || '',
                    files: stored.files
                  };
                }
              } catch (e) {}
            }
          }
        }

        // 2. Hydration from MongoDB database
        const res = await fetch('/api/ide/projects');
        if (res.ok) {
          const data = await res.json();
          if (data.projects && Array.isArray(data.projects)) {
            data.projects.forEach((proj: any) => {
              if (proj.projectId && proj.files && Object.keys(proj.files).length > 0) {
                mergedProjects[proj.projectId] = {
                  title: proj.title || proj.projectId,
                  desc: proj.desc || '',
                  files: proj.files
                };
              }
            });
          }
        }

        setAllProjects(mergedProjects);

        // 3. Restore last active project for this user if exists
        const lastActiveProjId = typeof window !== 'undefined' ? localStorage.getItem(`quantum_ide_${userScope}_active_project`) : null;
        if (lastActiveProjId && mergedProjects[lastActiveProjId]) {
          const targetProj = mergedProjects[lastActiveProjId];
          const primaryFile = Object.keys(targetProj.files).find(f => f.endsWith('.py')) || Object.keys(targetProj.files)[0] || 'main.py';
          setProjectName(lastActiveProjId);
          setProjectFiles(targetProj.files);
          setActiveFile(primaryFile);

          // Restore Telemetry
          try {
            const storedProjStr = localStorage.getItem(`quantum_ide_${userScope}_proj_${lastActiveProjId}`);
            if (storedProjStr) {
              const storedProj = JSON.parse(storedProjStr);
              if (storedProj.runtimeMetrics) {
                setRuntimeMetrics(storedProj.runtimeMetrics);
              }
            }
          } catch (e) {}

          // Restore Chat Messages
          try {
            const storedChat = localStorage.getItem(`quantum_chat_${userScope}_${lastActiveProjId}`);
            if (storedChat) {
              const parsed = JSON.parse(storedChat);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setChatMessages(parsed);
              }
            }
          } catch (e) {}
        }
      } catch (err) {
        console.warn('Failed to load projects from DB:', err);
      }
    };

    loadUserProjects();
  }, [userScope, isAuthenticated, isInitializing]);

  // Synchronize project workspace to localStorage and MongoDB backend
  const saveProjectToDatabase = useCallback(async (
    projId: string, 
    projData: { title?: string; desc?: string; files: Record<string, any> },
    currActiveFile: string,
    metrics: typeof runtimeMetrics
  ) => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(`quantum_ide_${userScope}_active_project`, projId);
        localStorage.setItem(`quantum_ide_${userScope}_proj_${projId}`, JSON.stringify({
          id: projId,
          title: projData.title,
          desc: projData.desc,
          files: projData.files,
          activeFile: currActiveFile,
          runtimeMetrics: metrics,
          updatedAt: new Date().toISOString()
        }));
      }

      await fetch('/api/ide/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: projId,
          title: projData.title,
          desc: projData.desc,
          files: projData.files,
          activeFile: currActiveFile,
          runtimeMetrics: metrics
        })
      });
    } catch (err) {
      console.warn('Failed to sync project to MongoDB:', err);
    }
  }, [userScope]);



// Helper to render gate symbols with official Quantum Measurement Gauge & CNOT Control/Target nodes
  const renderGateSlotContent = (gateInput: string | { name: string; role?: string; target?: number }) => {
    const gateName = typeof gateInput === 'string' ? gateInput : gateInput.name;
    const role = typeof gateInput === 'object' ? gateInput.role : undefined;

    if (gateName === 'measure') {
      return (
        <svg 
          className="w-4 h-4 text-cyan-300 transition-transform group-hover:scale-110" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2.2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <path d="M4 16a8 8 0 0 1 16 0" />
          <line x1="12" y1="16" x2="16" y2="9" />
          <circle cx="12" cy="16" r="1.5" fill="currentColor" />
        </svg>
      );
    }
    if (gateName === 'cx') {
      if (role === 'control') {
        return (
          <div className="relative flex items-center justify-center">
            <svg className="w-4 h-4 text-sky-400 drop-shadow-[0_0_6px_rgba(56,189,248,0.8)]" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="12" r="7.5" />
            </svg>
          </div>
        );
      }
      if (role === 'target') {
        return (
          <div className="relative flex items-center justify-center">
            <svg className="w-4.5 h-4.5 text-sky-300 drop-shadow-[0_0_4px_rgba(56,189,248,0.5)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="8.5" fill={isDark ? '#0c4a6e' : '#e0f2fe'} />
              <line x1="12" y1="3" x2="12" y2="21" />
              <line x1="3" y1="12" x2="21" y2="12" />
            </svg>
          </div>
        );
      }
      return 'CX';
    }
    if (gateName === 'cz') {
      if (role === 'control') {
        return (
          <div className="relative flex items-center justify-center">
            <svg className="w-4 h-4 text-sky-400 drop-shadow-[0_0_6px_rgba(56,189,248,0.8)]" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="12" r="7.5" />
            </svg>
          </div>
        );
      }
      if (role === 'target') {
        return <span className="font-bold text-sky-300">Z</span>;
      }
      return 'CZ';
    }
    if (gateName === 'swap') {
      return <span className="text-sm font-bold text-sky-300">✕</span>;
    }
    if (gateName === 'rzz') {
      if (role === 'control') {
        return (
          <div className="relative flex items-center justify-center">
            <svg className="w-4 h-4 text-emerald-400 drop-shadow-[0_0_6px_rgba(52,211,153,0.8)]" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="12" r="7.5" />
            </svg>
          </div>
        );
      }
      if (role === 'target') {
        return <span className="font-bold text-emerald-300 text-[11px]">Rzz</span>;
      }
      return 'Rzz';
    }
    if (gateName === 'ccx') {
      if (role === 'control') {
        return (
          <div className="relative flex items-center justify-center">
            <svg className="w-4 h-4 text-sky-400 drop-shadow-[0_0_6px_rgba(56,189,248,0.8)]" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="12" r="7.5" />
            </svg>
          </div>
        );
      }
      if (role === 'target') {
        return (
          <div className="relative flex items-center justify-center">
            <svg className="w-4.5 h-4.5 text-sky-300 drop-shadow-[0_0_4px_rgba(56,189,248,0.5)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="8.5" fill={isDark ? '#0c4a6e' : '#e0f2fe'} />
              <line x1="12" y1="3" x2="12" y2="21" />
              <line x1="3" y1="12" x2="21" y2="12" />
            </svg>
          </div>
        );
      }
      return 'CCX';
    }
    if (gateName === 'rx') return 'Rx';
    if (gateName === 'ry') return 'Ry';
    if (gateName === 'rz') return 'Rz';
    return gateName.toUpperCase();
  };

  // Create a new Python file in active project
  const handleCreateNewFile = () => {
    const pyFiles = Object.keys(projectFiles).filter(f => f.endsWith('.py'));
    const nextNum = pyFiles.length + 1;
    const newFileName = `circuit_${nextNum}.py`;
    const starterContent = `from qiskit import QuantumCircuit\nfrom qiskit_aer import AerSimulator\n\n# ⚛️ Bell State Entanglement Circuit\nqc = QuantumCircuit(2)\nqc.h(0)\nqc.cx(0, 1)\n\n# Execute on AerSimulator\nsim = AerSimulator()\nresult = sim.run(qc, shots=1024).result()\nprint('Measurement Counts:', result.get_counts())\n`;

    setProjectFiles(prev => {
      const updated = {
        ...prev,
        [newFileName]: {
          name: newFileName,
          lang: 'python',
          content: starterContent
        }
      };
      const updatedProj = {
        ...(allProjects[projectName] || {}),
        files: updated
      };
      setAllProjects(pPrev => ({
        ...pPrev,
        [projectName]: updatedProj
      }));
      saveProjectToDatabase(projectName, updatedProj, newFileName, runtimeMetrics);
      return updated;
    });

    setActiveFile(newFileName);
  };

  // Create a new project with custom name and chosen scaffold template
  const handleCreateCustomProject = () => {
    const rawName = customProjectInput.trim();
    const finalName = rawName ? rawName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9_-]/g, '') : `quantum-project-${Date.now().toString().slice(-4)}`;
    
    // Get scaffold files from selected template
    const templateData = initialProjectTemplates[selectedTemplateKey] || initialProjectTemplates['my-quantum-project'];
    const newFiles = { ...templateData.files };

    // Update allProjects dictionary
    setAllProjects(prev => ({
      ...prev,
      [finalName]: {
        title: finalName,
        desc: `Custom project scaffolded from ${templateData.title}`,
        files: newFiles
      }
    }));

    // Switch active workspace
    const primaryFile = Object.keys(newFiles).find(f => f.endsWith('.py')) || Object.keys(newFiles)[0] || 'main.py';
    setProjectName(finalName);
    setProjectFiles(newFiles);
    setActiveFile(primaryFile);
    setCustomProjectInput('');
    setIsNewProjectOpen(false);
    setIsProjectsDropdownOpen(false);

    // ⚡ Auto-configure Target Backend & Active Bottom Tab based on Architecture
    const targetB = templateData.backend || (selectedTemplateKey.includes('dwave') || selectedTemplateKey.includes('portfolio') ? 'dwave_simulated_annealing' : 'aer_simulator');
    setTargetBackend(targetB);
    const targetTab = templateData.defaultTab || (targetB.includes('dwave') ? 'terminal' : 'circuit');
    setActiveBottomTab(targetTab);
    setIsBottomOpen(true);

    if (newFiles[primaryFile]?.content) {
      const code = newFiles[primaryFile].content;
      const qCount = parseQiskitQubitCount(code);
      const gates = parseQiskitCodeToGates(code, qCount);
      setCanvasQubits(qCount);
      setCircuitGates(gates);
    }

    // Persist to MongoDB
    saveProjectToDatabase(finalName, { title: finalName, desc: `Custom project scaffolded from ${templateData.title}`, files: newFiles }, primaryFile, runtimeMetrics);

    setChatMessages(prev => [...prev, {
      id: Date.now().toString(),
      sender: 'agent',
      text: `Created and opened project: ${finalName} (scaffolded from ${templateData.title}). Saved to MongoDB with \`main.py\` and \`MEMORY.md\`.`
    }]);
  };



  const handleRun = async (targetTab?: 'circuit' | 'terminal' | 'results') => {
    setIsRunning(true);
    setIsBottomOpen(true);
    if (targetTab) {
      setActiveBottomTab(targetTab);
    } else {
      setActiveBottomTab('terminal');
    }

    const currentCode = projectFiles[activeFile]?.content || '';
    setTerminalLogs(prev => [
      ...prev,
      `➜ python3 ${activeFile} (${targetBackend}, ${shots} shots)`
    ]);

    try {
      const res = await fetch(`${BACKEND_URL}/v3/enterprise/ide/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectName,
          file_name: activeFile,
          code: currentCode,
          target_backend: targetBackend,
          shots: Number(shots) || 1024,
          project_files: Object.fromEntries(
            Object.entries(projectFiles).map(([name, f]) => [name, f.content])
          )
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          const outLines = (data.stdout || '').split('\n').filter(Boolean);
          const optLogs = data.optimization_results ? [
            `⚡ D-Wave Annealer Telemetry:`,
            `  • Optimal Ground Energy : ${data.optimization_results.energy}`,
            `  • Lowest Energy Sample  : ${JSON.stringify(data.optimization_results.sample)}`,
            `  • Decision Variables    : ${data.optimization_results.num_variables}`,
            `  • Number of Reads       : ${data.optimization_results.num_reads || shots}`
          ] : [];
          setTerminalLogs(prev => [
            ...prev,
            ...outLines,
            ...optLogs,
            `✔ Execution completed on ${data.backend_used} in ${data.execution_time_ms}ms`
          ]);

          if (data.optimization_results) {
            setOptimizationResults(data.optimization_results);
          }
          if (data.measurement_counts) {
            setSimulationCounts(data.measurement_counts);
          }
          if (data.circuit_ascii) {
            setCircuitAscii(data.circuit_ascii);
          }
          if (data.circuit_gates && data.circuit_gates.length > 0) {
            const normalized = normalizeCircuitGates(data.circuit_gates);
            if (normalized.length > 0) {
              setCircuitGates(normalized);
              if (data.active_qubits) setCanvasQubits(data.active_qubits);
            }
          }
        } else {
          setTerminalLogs(prev => [
            ...prev,
            `✖ Error executing ${activeFile}:`,
            data.stderr || data.error || 'Unknown execution error'
          ]);
        }
      } else {
        let errorDetail = "";
        try {
          const errJson = await res.json();
          errorDetail = errJson.detail || errJson.error || JSON.stringify(errJson);
        } catch (_) {}
        setTerminalLogs(prev => [
          ...prev,
          `✖ Runner HTTP Error ${res.status} from ${BACKEND_URL}: Failed to reach simulator backend. ${errorDetail}`
        ]);
      }
    } catch (err: any) {
      setTerminalLogs(prev => [
        ...prev,
        `✖ Connection Error: ${err.message || err}`
      ]);
    } finally {
      setIsRunning(false);
    }
  };

  // Helper: Synchronize placed gates to Python code with 2D coordinates (# t=...)
  const synchronizeGatesToCode = (gates: Array<{ name: string; qubit: number; step: number; target?: number; role?: string }>) => {
    const numQubits = Math.max(canvasQubits, ...gates.map(g => g.qubit + 1));
    const measureGates = gates.filter(g => g.name === 'measure');
    const allMeasured = measureGates.length >= numQubits && new Set(measureGates.map(g => g.qubit)).size === numQubits;
    const hasManualMeasure = measureGates.length > 0;

    let newCodeLines = [
      'from qiskit import QuantumCircuit',
      'from qiskit_aer import AerSimulator',
      '',
      `# ⚛️ Synthesized Interactive Circuit (${numQubits} Qubits)`,
      hasManualMeasure && !allMeasured ? `qc = QuantumCircuit(${numQubits}, ${numQubits})` : `qc = QuantumCircuit(${numQubits})`
    ];

    const sorted = [...gates]
      .filter(g => g.role !== 'target')
      .sort((a, b) => a.step - b.step || a.qubit - b.qubit);

    sorted.forEach(g => {
      let code = '';
      if (g.name === 'h') code = `qc.h(${g.qubit})`;
      else if (g.name === 'x') code = `qc.x(${g.qubit})`;
      else if (g.name === 'y') code = `qc.y(${g.qubit})`;
      else if (g.name === 'z') code = `qc.z(${g.qubit})`;
      else if (g.name === 's') code = `qc.s(${g.qubit})`;
      else if (g.name === 't') code = `qc.t(${g.qubit})`;
      else if (g.name === 'rx') code = `qc.rx(0.7854, ${g.qubit})`;
      else if (g.name === 'ry') code = `qc.ry(0.7854, ${g.qubit})`;
      else if (g.name === 'rz') code = `qc.rz(0.7854, ${g.qubit})`;
      else if (g.name === 'cx') {
        const targetQ = g.target !== undefined ? g.target : ((g.qubit + 1) % numQubits);
        code = `qc.cx(${g.qubit}, ${targetQ})`;
      }
      else if (g.name === 'cz') {
        const targetQ = g.target !== undefined ? g.target : ((g.qubit + 1) % numQubits);
        code = `qc.cz(${g.qubit}, ${targetQ})`;
      }
      else if (g.name === 'swap') {
        const targetQ = g.target !== undefined ? g.target : ((g.qubit + 1) % numQubits);
        code = `qc.swap(${g.qubit}, ${targetQ})`;
      }
      else if (g.name === 'ccx') {
        const q1 = g.qubit;
        const q2 = (g.qubit + 1) % numQubits;
        const q3 = g.target !== undefined ? g.target : ((g.qubit + 2) % numQubits);
        code = `qc.ccx(${q1}, ${q2}, ${q3})`;
      }
      else if (g.name === 'measure' && !allMeasured) {
        code = `qc.measure(${g.qubit}, ${g.qubit})`;
      }

      if (code) {
        newCodeLines.push(`${code}  # t=${g.step}`);
      }
    });

    if (allMeasured) {
      newCodeLines.push('qc.measure_all()');
    }

    newCodeLines.push('');
    newCodeLines.push('# Execute on AerSimulator');
    newCodeLines.push('sim = AerSimulator()');
    newCodeLines.push(`result = sim.run(qc, shots=${shots || 1024}).result()`);
    newCodeLines.push("print('Measurement Counts:', result.get_counts())");

    const newCode = newCodeLines.join('\n');
    setProjectFiles(prev => ({
      ...prev,
      [activeFile]: { ...prev[activeFile], content: newCode }
    }));
    setAllProjects(pPrev => ({
      ...pPrev,
      [projectName]: {
        ...(pPrev[projectName] || {}),
        files: { ...(pPrev[projectName]?.files || {}), [activeFile]: { content: newCode } }
      }
    }));
    saveProjectToDatabase(projectName, { files: { [activeFile]: { name: activeFile, content: newCode, language: 'python' } } }, activeFile, runtimeMetrics);
  };

  // Direct In-Place Slot Placement
  const handlePlaceGateOnSlot = (gateName: string, qubit: number, step: number) => {
    let updatedGates = [...circuitGates];

    if (gateName === 'cx' || gateName === 'cz' || gateName === 'swap') {
      const targetQ = (qubit + 1) % canvasQubits;
      // remove any previous gate on both slots at this step
      updatedGates = updatedGates.filter(g => !(g.step === step && (g.qubit === qubit || g.qubit === targetQ)));
      updatedGates.push({ name: gateName, qubit, step, target: targetQ, role: 'control' });
      updatedGates.push({ name: gateName, qubit: targetQ, step, target: qubit, role: 'target' });
    } else {
      const existingIndex = updatedGates.findIndex(g => g.qubit === qubit && g.step === step);
      const gateObj = { name: gateName, qubit, step, role: 'single' as const };
      if (existingIndex >= 0) {
        const prev = updatedGates[existingIndex];
        if (prev.target !== undefined) {
          updatedGates = updatedGates.filter(g => !(g.qubit === prev.target && g.step === step));
        }
        updatedGates[existingIndex] = gateObj;
      } else {
        updatedGates.push(gateObj);
      }
    }

    setCircuitGates(updatedGates);
    setSelectedGateTool(gateName);
    setActiveSlotPopover(null);
    synchronizeGatesToCode(updatedGates);
  };

  // Direct In-Place Slot Removal
  const handleRemoveGateFromSlot = (qubit: number, step: number) => {
    const gateToRemove = circuitGates.find(g => g.qubit === qubit && g.step === step);
    let updatedGates = circuitGates.filter(g => !(g.qubit === qubit && g.step === step));
    if (gateToRemove && gateToRemove.target !== undefined) {
      updatedGates = updatedGates.filter(g => !(g.qubit === gateToRemove.target && g.step === step));
    }
    setCircuitGates(updatedGates);
    setActiveSlotPopover(null);
    synchronizeGatesToCode(updatedGates);
  };

  // Interactive Circuit Canvas Gate Placement & Bi-directional Code Synthesis
  const handleToggleGateSlot = (qubit: number, step: number) => {
    const existingIndex = circuitGates.findIndex(g => g.qubit === qubit && g.step === step);
    let updatedGates = [...circuitGates];

    if (existingIndex >= 0) {
      const prev = updatedGates[existingIndex];
      updatedGates.splice(existingIndex, 1);
      if (prev.target !== undefined) {
        updatedGates = updatedGates.filter(g => !(g.qubit === prev.target && g.step === step));
      }
    } else {
      if (selectedGateTool === 'cx' || selectedGateTool === 'cz' || selectedGateTool === 'swap') {
        const targetQ = (qubit + 1) % canvasQubits;
        updatedGates = updatedGates.filter(g => !(g.step === step && (g.qubit === qubit || g.qubit === targetQ)));
        updatedGates.push({ name: selectedGateTool, qubit, step, target: targetQ, role: 'control' });
        updatedGates.push({ name: selectedGateTool, qubit: targetQ, step, target: qubit, role: 'target' });
      } else {
        updatedGates.push({
          name: selectedGateTool,
          qubit: qubit,
          step: step,
          role: 'single'
        });
      }
    }

    setCircuitGates(updatedGates);
    synchronizeGatesToCode(updatedGates);
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const currentCode = projectFiles[activeFile]?.content || '';
      const isDwave = currentCode.includes('dimod') ||
                      currentCode.includes('neal') ||
                      currentCode.includes('SimulatedAnnealingSampler') ||
                      currentCode.includes('DWaveSampler') ||
                      currentCode.includes('BinaryQuadraticModel') ||
                      targetBackend.includes('dwave');

      if (isDwave) {
        // D-Wave code: Execute sandbox to synthesize dual QAOA circuit and stay on circuit canvas
        await handleRun('circuit');
      } else if (currentCode.includes('QuantumCircuit')) {
        const declaredQubits = parseQiskitQubitCount(currentCode);
        const parsedGates = parseQiskitCodeToGates(currentCode, declaredQubits);
        setCanvasQubits(declaredQubits);
        setCircuitGates(parsedGates);
      } else {
        await handleRun('circuit');
      }
    } catch (e) {
      console.error('Error during manual sync:', e);
    } finally {
      setTimeout(() => setIsSyncing(false), 400);
    }
  };

  const handleClearCircuitGates = () => {
    setCircuitGates([]);
    const clearedCode = `from qiskit import QuantumCircuit\nfrom qiskit_aer import AerSimulator\n\n# ⚛️ Synthesized Interactive Circuit (${canvasQubits} Qubits)\nqc = QuantumCircuit(${canvasQubits})\n# Wire cleared. Click slots in Circuit Canvas to add gates.\n\n# Execute on AerSimulator\nsim = AerSimulator()\nresult = sim.run(qc, shots=1024).result()\nprint('Measurement Counts:', result.get_counts())\n`;
    setProjectFiles(prev => {
      const updated = {
        ...prev,
        [activeFile]: {
          ...prev[activeFile],
          content: clearedCode
        }
      };
      const updatedProj = {
        ...(allProjects[projectName] || {}),
        files: updated
      };
      setAllProjects(pPrev => ({
        ...pPrev,
        [projectName]: updatedProj
      }));
      saveProjectToDatabase(projectName, updatedProj, activeFile, runtimeMetrics);
      return updated;
    });
  };

  const handleSimulate = () => {
    setActiveBottomTab('circuit');
  };

  // ─────────────────────────────────────────────────────────────
  // 🧠 LIVE CONTEXT-AWARE AGENT REASONING + LIVE CODE & TELEMETRY MUTATION
  // ─────────────────────────────────────────────────────────────
  const handleSendMessage = async (textToSend: string) => {
    const text = (textToSend || '').trim();
    if (!text || isCopilotThinking) return;

    const userMsg: ChatMessage = { id: Date.now().toString(), sender: 'user', text };
    setChatMessages(prev => [...prev, userMsg]);
    setIsCopilotThinking(true);

    if (text === '/execute@program' || text.toLowerCase().includes('run program') || text.toLowerCase().includes('/run')) {
      handleRun();
    } else if (text === '/simulate@circuit' || text.toLowerCase().includes('simulate circuit')) {
      handleSimulate();
    }

    try {
      const res = await fetch(`${BACKEND_URL}/v3/enterprise/ide/agent/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectName,
          user_message: text,
          active_file: activeFile,
          file_content: projectFiles[activeFile]?.content || '',
          target_backend: targetBackend,
          optimization_level: optimizationLevel,
          model_engine: activeModel,
          history: (chatMessages || []).slice(-6).map(m => ({ sender: m.sender, text: m.text }))
        })
      });

      if (res.ok) {
        const data = await res.json();
        
        // 1. Update Chat Response with Autonomous Workflow Steps & Code Mutation Summary
        const mutationData = data.code_mutation ? {
          fileName: data.code_mutation.file_name,
          action: data.code_mutation.action || 'MUTATE',
          linesAdded: data.code_mutation.lines_added || 0,
          linesRemoved: data.code_mutation.lines_removed || 0,
          totalLines: data.code_mutation.total_lines || 0,
          summary: data.code_mutation.summary || ''
        } : undefined;

        setChatMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          sender: 'agent',
          text: data.response_text || 'Completed autonomous quantum analysis.',
          workflowSteps: data.workflow_steps || undefined,
          scientificVerdict: data.scientific_verdict || undefined,
          codeMutation: mutationData,
          toolCall: data.tool_call || undefined
        }]);

        // 2. Dynamically Mutate Code & MEMORY.md in Workspace
        if (data.updated_code || data.qubo_matrix_code || data.updated_files || data.memory_md) {
          setProjectFiles(prev => {
            const updated = { ...prev };

            if (data.updated_code) {
              const newCode = data.updated_code;
              const targetFileKey = updated[activeFile] && activeFile !== 'MEMORY.md' && activeFile !== 'quantum.config.json'
                ? activeFile 
                : (Object.keys(updated).find(f => f.endsWith('.py')) || Object.keys(updated)[0] || 'main.py');
              
              if (activeFile !== 'MEMORY.md' && targetFileKey !== activeFile) {
                setActiveFile(targetFileKey);
              }
              updated[targetFileKey] = {
                ...(updated[targetFileKey] || { name: targetFileKey, language: 'python' }),
                content: newCode
              };

              // ⚛️ Phase 2: Instant Bi-Directional Circuit Canvas & Qubit Synchronization
              const declaredQubits = parseQiskitQubitCount(newCode);
              const parsedGates = parseQiskitCodeToGates(newCode, declaredQubits);
              const maxGateQubit = parsedGates.length > 0 ? Math.max(...parsedGates.map(g => g.qubit + 1)) : 2;
              const finalQubits = Math.max(declaredQubits, maxGateQubit);
              setCanvasQubits(finalQubits);
              setCircuitGates(parsedGates);
            }

            if (data.qubo_matrix_code) {
              updated['qubo_matrix.py'] = {
                name: 'qubo_matrix.py',
                lang: 'python',
                language: 'python',
                content: data.qubo_matrix_code
              };
            }

            if (data.updated_files) {
              for (const [fName, fContent] of Object.entries(data.updated_files)) {
                updated[fName] = {
                  name: fName,
                  lang: fName.endsWith('.json') ? 'json' : (fName.endsWith('.md') ? 'markdown' : 'python'),
                  language: fName.endsWith('.json') ? 'json' : (fName.endsWith('.md') ? 'markdown' : 'python'),
                  content: fContent as string
                };
              }
            }

            if (data.memory_md) {
              updated['MEMORY.md'] = {
                name: 'MEMORY.md',
                lang: 'markdown',
                language: 'markdown',
                content: data.memory_md
              };
            }

            // Sync into allProjects workspace store
            setAllProjects(projPrev => ({
              ...projPrev,
              [projectName]: {
                ...(projPrev[projectName] || {}),
                files: updated
              }
            }));

            saveProjectToDatabase(
              projectName, 
              { title: projectName, desc: '', files: updated }, 
              activeFile, 
              data.runtime_telemetry || runtimeMetrics
            );

            return updated;
          });
        }

        // 3. Dynamically Mutate Real-Time Runtime Telemetry
        if (data.runtime_telemetry) {
          setRuntimeMetrics({
            activeQubits: data.runtime_telemetry.active_qubits || runtimeMetrics.activeQubits,
            depth: data.runtime_telemetry.depth || runtimeMetrics.depth,
            cnots: data.runtime_telemetry.cnots || runtimeMetrics.cnots,
            circuitText: data.runtime_telemetry.circuit_text || runtimeMetrics.circuitText,
            expectationVal: data.runtime_telemetry.expectation_val || runtimeMetrics.expectationVal,
            fidelity: data.runtime_telemetry.fidelity || runtimeMetrics.fidelity,
            latencySec: data.runtime_telemetry.latency_sec || runtimeMetrics.latencySec,
            terminalLog: data.runtime_telemetry.terminal_log || runtimeMetrics.terminalLog,
            qubo_telemetry: data.runtime_telemetry.qubo_telemetry || runtimeMetrics.qubo_telemetry
          });
        }
      } else {
        throw new Error('Backend agent error');
      }
    } catch (err) {
      setTimeout(() => {
        setChatMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          sender: 'agent',
          text: `### ⚛️ Quantum Analysis & Contextual Response\n\nRegarding your query: *"${text}"*\n\n1. Active Code Context (\`${activeFile}\`):\nYour current workspace is running ${runtimeMetrics.activeQubits} qubits (depth ${runtimeMetrics.depth}) on ${targetBackend}.\n\n2. Mathematical State:\n$$\\vert\\psi(\\theta)\\rangle = U_{\\text{ansatz}}(\\theta) U_{\\Phi}(\\mathbf{x})\\vert 0^{\\otimes 4}\\rangle$$\n- Statevector fidelity: ${runtimeMetrics.fidelity}\n- Expectation value: $\\langle Z_0 \\rangle = ${runtimeMetrics.expectationVal}$\n\n3. Recommended Actions:\n- Type \`/execute@program\` to stream results.\n- Click \`+ Connect Tool\` to attach any of the 33 quantum primitives.`,
          toolCall: {
            name: `Quantum Copilot (${activeModel.toUpperCase()})`,
            badge: 'Context Synced',
            detail: `Target: ${targetBackend} | Level ${optimizationLevel}`
          }
        }]);
      }, 400);
    } finally {
      setIsCopilotThinking(false);
    }
  };

  const files = projectFiles;

  // Prevent flashing private IDE interface or circuit data if unauthenticated
  if (isInitializing || !isAuthenticated) {
    return (
      <div 
        style={{ backgroundColor: colors.bgMain }}
        className="h-screen w-screen flex flex-col items-center justify-center font-sans select-none"
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#3066bb] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono text-slate-400">Verifying session...</span>
        </div>
      </div>
    );
  }

  return (
    <div 
      style={{ backgroundColor: colors.bgMain, color: colors.textPrimary }}
      className="h-screen w-screen flex flex-row font-sans select-none overflow-hidden relative"
    >
      {/* ── LEFT & CENTER REGION: HEADER + WORKSPACE (FLEX-1) ── */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 h-full overflow-hidden relative">
      
        {/* ───────────────────────────────────────────────────────────── */}
        {/* BLOCK A: TOP GLOBAL COMMAND BAR                               */}
        {/* ───────────────────────────────────────────────────────────── */}
      <header 
        style={{ backgroundColor: colors.bgHeader, borderColor: colors.border }}
        className="h-12 border-b px-4 flex items-center justify-between shrink-0 z-20 shadow-xs"
      >
        {/* Left: Brand & Project Breadcrumb Dropdown */}
        <div className="flex items-center gap-2.5">


          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center p-0.5 shrink-0 shadow-xs">
              <img 
                src="/qg-icon.png" 
                alt="Quantum Guru Logo" 
                className="w-full h-full object-contain"
              />
            </div>
            <span className="font-normal text-sm tracking-tight font-heading" style={{ color: colors.textPrimary }}>
              Quantum Guru
            </span>
          </div>

          <div style={{ backgroundColor: colors.border }} className="h-4 w-px mx-1" />

          {/* Project Switcher Dropdown */}
          <div className="relative">
            <div 
              onClick={() => setIsProjectsDropdownOpen(!isProjectsDropdownOpen)}
              style={{ backgroundColor: colors.bgPill, borderColor: colors.border }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs cursor-pointer transition-colors font-normal hover:border-sky-500"
            >
              <Folder className="w-3.5 h-3.5" style={{ color: colors.textCyan }} />
              <span className="font-mono font-normal" style={{ color: colors.textPrimary }}>{projectName}</span>
              <ChevronDown className="w-3 h-3 ml-1" style={{ color: colors.textMuted }} />
            </div>

            {/* Project List Popover */}
            {isProjectsDropdownOpen && (
              <div 
                style={{ backgroundColor: colors.bgCard, borderColor: colors.border }}
                className="absolute top-full left-0 mt-1.5 w-64 border rounded-xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100"
              >
                <div className="text-[10px] font-normal uppercase tracking-wider px-2 py-1 mb-1 font-heading" style={{ color: colors.textCyan }}>
                  Switch Workspace Project
                </div>
                <div className="space-y-1">
                  {Object.keys(allProjects || {}).map((pKey) => (
                    <div
                      key={pKey}
                      onClick={() => handleSwitchProject(pKey)}
                      style={{ 
                        backgroundColor: projectName === pKey ? colors.bgPill : 'transparent',
                        borderColor: projectName === pKey ? colors.textCyan : 'transparent',
                        color: projectName === pKey ? colors.textPrimary : colors.textMuted
                      }}
                      className="px-2.5 py-1.5 rounded-lg border text-xs font-mono flex items-center justify-between cursor-pointer hover:border-sky-500 transition-colors"
                    >
                      <span className="truncate">{pKey}</span>
                      {projectName === pKey && <Check className="w-3.5 h-3.5" style={{ color: colors.textEmerald }} />}
                    </div>
                  ))}
                </div>
                <div className="pt-2 mt-1 border-t" style={{ borderColor: colors.border }}>
                  <button
                    onClick={() => { setIsProjectsDropdownOpen(false); setIsNewProjectOpen(true); }}
                    style={{ backgroundColor: colors.bgPill, color: colors.textAmber, borderColor: colors.border }}
                    className="w-full py-1 text-xs rounded-md border font-normal flex items-center justify-center gap-1 hover:border-amber-400 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Create New Project</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Header Right Spacer */}
        <div className="flex items-center gap-2" />
      </header>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MAIN WORKSPACE (20% Left / 60% Center / 20% Right)            */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        
        {/* ─────────────────────────────────────────────────────────── */}
        {/* SECTION 1 (LEFT): 5% COMPACT ACTIVITY DOCK                    */}
        {/* ─────────────────────────────────────────────────────────── */}
        {isLeftOpen ? (
          <aside 
            style={{ 
              width: `${leftWidth}px`, 
              backgroundColor: colors.bgSection1, 
              borderColor: colors.border 
            }}
            className="border-r flex flex-col shrink-0 relative select-none pt-3 pb-0 px-1.5 justify-between overflow-hidden"
          >
            {/* ── TOP ACTIONS: NEW PROJECT & ACTIVE FILES (HIGH-END ERGONOMIC DOCK) ── */}
            <div className="space-y-2.5 flex flex-col items-center w-full">
              {/* 1. New Project Action Button */}
              <button
                onClick={() => setIsNewProjectOpen(true)}
                className={`w-[52px] h-[50px] flex flex-col items-center justify-center rounded-xl border transition-all cursor-pointer group ${
                  isDark
                    ? 'border-transparent text-zinc-400 hover:border-zinc-700/80 hover:bg-zinc-800/80 hover:text-zinc-100 hover:scale-[1.04]'
                    : 'border-transparent text-slate-600 hover:border-slate-300 hover:bg-white hover:text-slate-900 hover:shadow-xs hover:scale-[1.04]'
                }`}
                title="Create New Quantum Project"
              >
                <FolderPlus className="w-4.5 h-4.5 mb-1 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-medium font-sans text-center leading-none">New</span>
              </button>

              {/* 2. Active Python Files (e.g. main.py) */}
              <div className="space-y-2 w-full flex flex-col items-center pt-0.5">
                {Object.keys(files || {})
                  .filter(f => f.endsWith('.py'))
                  .map(fName => {
                    const isActive = activeFile === fName;
                    const shortName = fName.replace('.py', '');
                    return (
                      <button
                        key={fName}
                        onClick={() => setActiveFile(fName)}
                        className={`w-[52px] h-[50px] flex flex-col items-center justify-center rounded-xl border transition-all cursor-pointer group ${
                          isActive
                            ? isDark
                              ? 'border-transparent hover:border-zinc-700/80 hover:bg-zinc-800/80 hover:scale-[1.04]'
                              : 'border-transparent hover:border-slate-300 hover:bg-white hover:shadow-xs hover:scale-[1.04]'
                            : isDark
                              ? 'border-transparent text-zinc-400 hover:border-zinc-700/80 hover:bg-zinc-800/80 hover:text-zinc-100 hover:scale-[1.04]'
                              : 'border-transparent text-slate-600 hover:border-slate-300 hover:bg-white hover:text-slate-900 hover:shadow-xs hover:scale-[1.04]'
                        }`}
                        title={`Open ${fName}`}
                      >
                        <FileCode 
                          className="w-4.5 h-4.5 mb-1 transition-colors" 
                          style={isActive ? { color: colors.textCyan } : undefined}
                        />
                        <span 
                          className={`text-[10px] font-mono truncate max-w-[46px] px-0.5 text-center leading-none ${
                            isActive ? 'font-semibold' : 'font-medium'
                          }`}
                          style={isActive ? { color: colors.textCyan } : undefined}
                        >
                          {shortName === 'main' ? 'main.py' : fName}
                        </span>
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* ── BOTTOM ACTIONS: THEME, MARKETPLACE, SETTINGS & LOGOUT ── */}
            <div 
              className="border-t w-full shrink-0 transition-all duration-150" 
              style={{ 
                height: isBottomOpen ? `${bottomHeight}px` : 'auto',
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'space-evenly',
                paddingTop: '8px', 
                paddingBottom: '8px', 
                borderColor: colors.borderSection2 
              }}
            >
              {/* 3. Theme Toggle Action Button */}
              <button
                onClick={() => setTheme(isDark ? 'light' : 'dark')}
                className={`w-[52px] h-[50px] flex flex-col items-center justify-center rounded-xl border transition-all cursor-pointer group ${
                  isDark
                    ? 'border-transparent text-zinc-400 hover:border-zinc-700/80 hover:bg-zinc-800/80 hover:text-zinc-100 hover:scale-[1.04]'
                    : 'border-transparent text-slate-600 hover:border-slate-300 hover:bg-white hover:text-slate-900 hover:shadow-xs hover:scale-[1.04]'
                }`}
                title={`Switch to ${isDark ? 'Light' : 'Dark'} Theme`}
              >
                {isDark ? (
                  <Sun className="w-4.5 h-4.5 mb-1 group-hover:rotate-90 transition-transform duration-300" />
                ) : (
                  <Moon className="w-4.5 h-4.5 mb-1 group-hover:-rotate-12 transition-transform duration-300" />
                )}
                <span className="text-[10px] font-medium font-sans text-center leading-none">Theme</span>
              </button>

              {/* 4. Marketplace Action Button */}
              <Link
                href="/marketplace"
                className={`w-[52px] h-[50px] flex flex-col items-center justify-center rounded-xl border transition-all cursor-pointer group ${
                  isDark
                    ? 'border-transparent text-zinc-400 hover:border-zinc-700/80 hover:bg-zinc-800/80 hover:text-zinc-100 hover:scale-[1.04]'
                    : 'border-transparent text-slate-600 hover:border-slate-300 hover:bg-white hover:text-slate-900 hover:shadow-xs hover:scale-[1.04]'
                }`}
                title="Browse 33 Quantum Capabilities Marketplace"
              >
                <Zap className="w-4.5 h-4.5 mb-1 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-medium font-sans text-center leading-none">Market</span>
              </Link>

              {/* 5. Settings Action Button */}
              <button
                onClick={() => setIsSettingsOpen(true)}
                className={`w-[52px] h-[50px] flex flex-col items-center justify-center rounded-xl border transition-all cursor-pointer group ${
                  isDark
                    ? 'border-transparent text-zinc-400 hover:border-zinc-700/80 hover:bg-zinc-800/80 hover:text-zinc-100 hover:scale-[1.04]'
                    : 'border-transparent text-slate-600 hover:border-slate-300 hover:bg-white hover:text-slate-900 hover:shadow-xs hover:scale-[1.04]'
                }`}
                title="IDE Settings"
              >
                <Settings className="w-4.5 h-4.5 mb-1 group-hover:rotate-45 transition-transform duration-300" />
                <span className="text-[10px] font-medium font-sans text-center leading-none">Settings</span>
              </button>

              {/* 6. Logout Action Button */}
              <button
                onClick={() => {
                  try {
                    logout();
                  } catch (e) {}
                  window.location.replace('/login');
                }}
                className={`w-[52px] h-[50px] flex flex-col items-center justify-center rounded-xl border transition-all cursor-pointer group ${
                  isDark
                    ? 'border-transparent text-zinc-400 hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-400 hover:scale-[1.04]'
                    : 'border-transparent text-slate-600 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 hover:shadow-xs hover:scale-[1.04]'
                }`}
                title="Logout of Quantum Guru"
              >
                <LogOut className="w-4.5 h-4.5 mb-1 group-hover:-translate-x-0.5 transition-transform" />
                <span className="text-[10px] font-medium font-sans text-center leading-none">Logout</span>
              </button>
            </div>
          </aside>
        ) : null}

        {/* ── DRAGGABLE RESIZER FOR SECTION 1 (LEFT) ── */}
        {isLeftOpen && (
          <div 
            onMouseDown={handleLeftMouseDown}
            className="w-1.5 hover:w-2 bg-transparent hover:bg-sky-500/30 active:bg-sky-500 cursor-col-resize z-30 transition-all shrink-0 flex items-center justify-center -ml-0.5 group"
            title="Drag to resize Section 1 width"
          >
            <div style={{ backgroundColor: colors.border }} className="w-0.5 h-6 rounded group-hover:bg-sky-500" />
          </div>
        )}

        {/* ───────────────────────────────────────────────────────── */}
        {/* SECTION 2 (CENTER - IN FOCUS): CODE EDITOR + CANVAS       */}
        {/* ───────────────────────────────────────────────────────── */}
        <div style={{ backgroundColor: colors.bgSection2, borderColor: colors.borderSection2 }} className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden relative shadow-2xl">
          
          {/* Upper Pane: Interactive Monaco Code Canvas */}
          <div style={{ borderColor: colors.border }} className="flex-1 flex flex-col min-h-0 overflow-hidden border-b">
            <div 
              style={{ backgroundColor: colors.bgEditor, color: colors.textPrimary }}
              className="flex-1 min-h-0 overflow-auto p-4 font-mono text-xs leading-relaxed flex"
            >
              {/* Line Numbers */}
              <div 
                style={{ borderColor: colors.border, color: colors.textMuted }}
                className="pr-4 select-none text-right font-mono border-r mr-4 space-y-0.5 opacity-50"
              >
                {(projectFiles[activeFile]?.content || '# Empty file').split('\n').map((_: string, idx: number) => (
                  <div key={idx}>{idx + 1}</div>
                ))}
              </div>

              {/* Editable Code Canvas */}
              <textarea
                value={projectFiles[activeFile]?.content || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setProjectFiles(prev => {
                    const updated = {
                      ...prev,
                      [activeFile]: {
                        ...prev[activeFile],
                        content: val
                      }
                    };
                    const updatedProj = {
                      ...(allProjects[projectName] || {}),
                      files: updated
                    };
                    setAllProjects(pPrev => ({
                      ...pPrev,
                      [projectName]: updatedProj
                    }));
                    saveProjectToDatabase(projectName, updatedProj, activeFile, runtimeMetrics);
                    return updated;
                  });

                  // 🔄 LIVE CODE -> CANVAS SYNCHRONIZATION (DYNAMIC QUBIT COUNT & GATES)!
                  const isDwave = val.includes('dimod') ||
                                  val.includes('neal') ||
                                  val.includes('SimulatedAnnealingSampler') ||
                                  val.includes('DWaveSampler') ||
                                  val.includes('BinaryQuadraticModel') ||
                                  val.includes('Q = {') ||
                                  val.includes('Q ={') ||
                                  targetBackend.includes('dwave');

                  if (isDwave) {
                    const quboRes = parseQuboCodeToQaoaGates(val);
                    if (quboRes.gates.length > 0) {
                      setCanvasQubits(quboRes.numQubits);
                      setCircuitGates(quboRes.gates);
                    }
                  } else {
                    const declaredQubits = parseQiskitQubitCount(val);
                    const parsedGates = parseQiskitCodeToGates(val, declaredQubits);
                    if (parsedGates.length > 0 || val.includes('QuantumCircuit')) {
                      const maxGateQubit = parsedGates.length > 0 ? Math.max(...parsedGates.map(g => g.qubit + 1)) : 2;
                      const finalQubits = Math.max(declaredQubits, maxGateQubit);
                      setCanvasQubits(finalQubits);
                      setCircuitGates(parsedGates);
                    }
                  }

                  // ⚡ Continuous Debounced Auto-Sync for D-Wave code without manual clicking
                  if (isDwave) {
                    if (autoSyncTimer.current) clearTimeout(autoSyncTimer.current);
                    autoSyncTimer.current = setTimeout(() => {
                      syncCircuitBackground(val);
                    }, 800);
                  }
                }}
                spellCheck={false}
                style={{ 
                  backgroundColor: colors.bgEditor, 
                  color: colors.textPrimary,
                  caretColor: colors.textCyan,
                  outline: 'none',
                  border: 'none',
                  boxShadow: 'none'
                }}
                className="flex-1 overflow-x-auto whitespace-pre font-normal font-mono outline-none focus:outline-none focus:ring-0 border-none shadow-none resize-none bg-transparent w-full h-full"
              />
            </div>
          </div>

          {/* ── LOWER PANE: COLLAPSIBLE MULTI-TAB BOTTOM DRAWER ── */}
          <div 
            style={{ 
              borderColor: colors.borderSection2,
              height: isBottomOpen ? `${bottomHeight}px` : '36px',
              backgroundColor: colors.bgBottomDrawer
            }} 
            className="shrink-0 flex flex-col transition-all duration-150 overflow-hidden border-t"
          >
            {/* ── UNIFIED SINGLE-ROW DRAWER HEADER (TABS + ACTIONS + CONTROLS) ── */}
            <div 
              style={{ backgroundColor: colors.bgBottomDrawerHeader, borderColor: colors.border }}
              className="h-10 px-3.5 border-b flex items-center justify-between shrink-0 select-none"
            >
              {/* ZONE 1 (LEFT): Navigation Mode Tabs */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => { setActiveBottomTab('circuit'); setIsBottomOpen(true); }}
                  style={{
                    backgroundColor: activeBottomTab === 'circuit' && isBottomOpen ? colors.bgPill : 'transparent',
                    color: activeBottomTab === 'circuit' && isBottomOpen ? colors.textCyan : colors.textMuted,
                    borderColor: activeBottomTab === 'circuit' && isBottomOpen ? colors.border : 'transparent'
                  }}
                  className="px-2.5 py-1 rounded-lg text-xs font-sans font-medium flex items-center gap-1.5 cursor-pointer border transition-colors"
                >
                  <Cpu className="w-3.5 h-3.5" />
                  <span>Interactive Circuit Canvas</span>
                </button>

                <button
                  onClick={() => { setActiveBottomTab('terminal'); setIsBottomOpen(true); }}
                  style={{
                    backgroundColor: activeBottomTab === 'terminal' && isBottomOpen ? colors.bgPill : 'transparent',
                    color: activeBottomTab === 'terminal' && isBottomOpen ? colors.textEmerald : colors.textMuted,
                    borderColor: activeBottomTab === 'terminal' && isBottomOpen ? colors.border : 'transparent'
                  }}
                  className="px-2.5 py-1 rounded-lg text-xs font-sans font-medium flex items-center gap-1.5 cursor-pointer border transition-colors"
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span>QPU Terminal</span>
                  {isRunning && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                </button>

                <button
                  onClick={() => { setActiveBottomTab('results'); setIsBottomOpen(true); }}
                  style={{
                    backgroundColor: activeBottomTab === 'results' && isBottomOpen ? colors.bgPill : 'transparent',
                    color: activeBottomTab === 'results' && isBottomOpen ? colors.textAmber : colors.textMuted,
                    borderColor: activeBottomTab === 'results' && isBottomOpen ? colors.border : 'transparent'
                  }}
                  className="px-2.5 py-1 rounded-lg text-xs font-sans font-medium flex items-center gap-1.5 cursor-pointer border transition-colors"
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>{optimizationResults || targetBackend.includes('dwave') ? 'Energy & QUBO Results' : 'Measurement Results'}</span>
                </button>
              </div>

              {/* ZONE 2 & 3 (RIGHT): Context-Aware Actions & Window Controls */}
              <div className="flex items-center gap-2">
                {/* Circuit Canvas Actions */}
                {activeBottomTab === 'circuit' && isBottomOpen && (
                  <div className="flex items-center gap-2">
                    {/* Clickable Sync Button */}
                    <button
                      onClick={handleManualSync}
                      disabled={isSyncing}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-sans font-medium border transition-all cursor-pointer select-none hover:opacity-90 active:scale-95 disabled:opacity-50"
                      style={{
                        backgroundColor: isDark ? 'rgba(16, 185, 129, 0.10)' : 'rgba(16, 185, 129, 0.12)',
                        borderColor: isDark ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.35)',
                        color: isDark ? '#34d399' : '#059669'
                      }}
                      title="Sync code with interactive circuit canvas"
                    >
                      <RotateCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                      <span>Sync</span>
                    </button>

                    <button
                      onClick={handleClearCircuitGates}
                      className="px-2.5 py-1 rounded-lg border border-transparent text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 text-xs font-sans cursor-pointer transition-all"
                      title="Clear all gates from wires"
                    >
                      Clear Wire
                    </button>
                    <button
                      onClick={() => handleRun()}
                      className="px-3 py-1 rounded-lg bg-sky-500/20 border border-sky-500/50 text-sky-400 hover:bg-sky-500/30 text-xs font-sans font-medium flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                      title="Simulate active circuit on AerSimulator"
                    >
                      <Play className="w-3 h-3" />
                      <span>Simulate on Aer</span>
                    </button>
                  </div>
                )}

                {/* Terminal Actions */}
                {activeBottomTab === 'terminal' && isBottomOpen && (
                  <button
                    onClick={() => setTerminalLogs([])}
                    className="px-2.5 py-1 rounded-lg border border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 text-xs font-sans cursor-pointer transition-all"
                    title="Clear terminal output"
                  >
                    Clear Output
                  </button>
                )}

                {/* Measurement Results Actions */}
                {activeBottomTab === 'results' && isBottomOpen && (
                  <button
                    onClick={() => handleRun()}
                    className="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/50 text-amber-400 hover:bg-amber-500/30 text-xs font-sans font-medium flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                    title="Re-run simulation for fresh shots"
                  >
                    <RotateCw className="w-3 h-3" />
                    <span>Re-run Shots</span>
                  </button>
                )}

                {/* Subtle Hairline Divider */}
                <div className="h-4 w-px bg-zinc-700/50 my-auto" />

                {/* ZONE 3: Drawer Toggle Chevron */}
                <button
                  onClick={() => setIsBottomOpen(!isBottomOpen)}
                  style={{ color: colors.textMuted }}
                  className="p-1 rounded-lg hover:bg-zinc-800/50 transition-colors cursor-pointer"
                  title={isBottomOpen ? "Collapse drawer" : "Expand drawer"}
                >
                  {isBottomOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Drawer Body */}
            {isBottomOpen && (
              <div className="flex-1 min-h-0 overflow-auto">
                {/* TAB 1: INTERACTIVE CIRCUIT CANVAS */}
                {activeBottomTab === 'circuit' && (
                  <div className="p-3.5 font-sans h-full flex flex-col">
                    {/* Interactive Qubit Wires Grid (Starts immediately below unified header) */}
                    <div className="flex-1 overflow-x-auto min-h-0 py-1">
                      <div className="min-w-[640px] space-y-2">
                        {/* Timeline Steps Header */}
                        <div className="flex items-center gap-2.5 text-[10px] font-mono text-zinc-500 select-none pb-0.5">
                          <div className="w-12 text-center shrink-0">Wire</div>
                          <div 
                            style={{ display: 'grid', gridTemplateColumns: 'repeat(10, minmax(0, 1fr))', gap: '8px' }}
                            className="flex-1 text-center"
                          >
                            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(s => (
                              <div key={s} className="text-zinc-400 font-medium">t{s}</div>
                            ))}
                          </div>
                        </div>

                        {Array.from({ length: canvasQubits }, (_, i) => i).map(qIdx => (
                          <div key={qIdx} className="flex items-center gap-2.5">
                            {/* Qubit Wire Label */}
                            <div 
                              style={{ backgroundColor: colors.bgPill, borderColor: colors.border, color: colors.textCyan }}
                              className="w-12 h-8 rounded-lg border flex items-center justify-center font-mono text-xs font-semibold shrink-0 shadow-xs"
                            >
                              q[{qIdx}]
                            </div>

                            {/* Wire Line with 10 Sequential Time Step Slots */}
                            <div className="flex-1 flex items-center relative h-8">
                              {/* Continuous Horizontal Quantum Wire (Crisp contrast across entire timeline) */}
                              <div 
                                style={{ 
                                  position: 'absolute',
                                  left: 0,
                                  right: 0,
                                  top: '50%',
                                  transform: 'translateY(-50%)',
                                  height: '2.5px',
                                  backgroundColor: isDark ? '#64748b' : '#94a3b8',
                                  boxShadow: isDark ? '0 0 6px rgba(56, 189, 248, 0.35)' : 'none',
                                  zIndex: 1,
                                  pointerEvents: 'none'
                                }} 
                              />

                              {/* 10 Time Step Slots on this Qubit */}
                              <div 
                                style={{ display: 'grid', gridTemplateColumns: 'repeat(10, minmax(0, 1fr))', gap: '8px' }}
                                className="w-full relative z-10"
                              >
                                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(stepIdx => {
                                  const gateOnSlot = circuitGates.find(g => (g.qubit === qIdx || (Array.isArray((g as any).qubits) && (g as any).qubits[0] === qIdx)) && g.step === stepIdx);
                                  const isSelected = activeSlotPopover?.qubit === qIdx && activeSlotPopover?.step === stepIdx;

                                  return (
                                    <div key={stepIdx} className="relative w-full h-8 flex items-center justify-center">
                                      {/* ⚛️ Multi-Qubit Vertical Connecting Line (Continuous junction link, z-20 sits in front of button background) */}
                                      {gateOnSlot && gateOnSlot.role === 'control' && gateOnSlot.target !== undefined && (
                                        <div 
                                          style={{
                                            position: 'absolute',
                                            left: '50%',
                                            transform: 'translateX(-50%)',
                                            width: '3px',
                                            height: `${Math.abs(gateOnSlot.target - qIdx) * 40}px`,
                                            top: gateOnSlot.target > qIdx ? '50%' : undefined,
                                            bottom: gateOnSlot.target < qIdx ? '50%' : undefined,
                                            backgroundColor: isDark ? '#38bdf8' : '#0284c7',
                                            zIndex: 20,
                                            pointerEvents: 'none',
                                            boxShadow: isDark ? '0 0 8px rgba(56, 189, 248, 0.7)' : '0 0 4px rgba(2, 132, 199, 0.4)'
                                          }}
                                        />
                                      )}

                                      {/* Wire Slot Button (Semi-transparent empty slots reveal continuous horizontal wire) */}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (isSelected) {
                                            setActiveSlotPopover(null);
                                          } else {
                                            const rect = e.currentTarget.getBoundingClientRect();
                                            setActiveSlotPopover({
                                              qubit: qIdx,
                                              step: stepIdx,
                                              x: rect.left + rect.width / 2,
                                              y: rect.top
                                            });
                                          }
                                        }}
                                        style={{
                                          backgroundColor: gateOnSlot 
                                            ? (isDark ? '#0c4a6e' : '#e0f2fe') 
                                            : (isSelected ? (isDark ? 'rgba(56, 189, 248, 0.15)' : 'rgba(2, 132, 199, 0.1)') : 'transparent'),
                                          borderColor: gateOnSlot 
                                            ? (isDark ? '#38bdf8' : '#0284c7') 
                                            : (isSelected ? '#38bdf8' : 'transparent'),
                                          color: gateOnSlot 
                                            ? (isDark ? '#7dd3fc' : '#0369a1') 
                                            : (isDark ? '#64748b' : '#94a3b8')
                                        }}
                                        className={`wire-slot-btn relative z-10 w-full h-8 rounded-lg border flex items-center justify-center font-mono text-xs font-bold transition-all cursor-pointer ${
                                          isSelected
                                            ? 'ring-2 ring-sky-400 scale-[1.05]'
                                            : gateOnSlot 
                                              ? (isDark ? 'ring-1 ring-sky-400/50 shadow-xs' : 'ring-1 ring-sky-500/50 shadow-xs') 
                                              : (isDark 
                                                  ? 'hover:border-sky-500/40 hover:bg-sky-500/10 hover:text-sky-300' 
                                                  : 'hover:border-sky-400 hover:bg-sky-50 hover:text-sky-600')
                                        }`}
                                        title={gateOnSlot ? `Slot (q[${qIdx}], t${stepIdx}): ${gateOnSlot.name.toUpperCase()}${gateOnSlot.target !== undefined ? ` (${gateOnSlot.role === 'control' ? 'Ctrl -> q' + gateOnSlot.target : 'Target <- q' + gateOnSlot.target})` : ''}` : `Slot (q[${qIdx}], t${stepIdx}): Click to choose gate`}
                                      >
                                        <span className="relative z-30 flex items-center justify-center">
                                          {gateOnSlot ? renderGateSlotContent(gateOnSlot) : '+'}
                                        </span>
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* ── 🛡️ ULTRA-COMPACT 6-GATES-PER-ROW POPOVER (OPENS UPWARDS) ── */}
                    {activeSlotPopover && (
                      <div
                        style={{
                          position: 'fixed',
                          bottom: `${typeof window !== 'undefined' ? window.innerHeight - activeSlotPopover.y + 10 : 300}px`,
                          left: `${typeof window !== 'undefined' ? Math.max(12, Math.min(window.innerWidth - 280, activeSlotPopover.x - 134)) : activeSlotPopover.x}px`,
                          width: '268px',
                          backgroundColor: isDark ? '#141418' : '#ffffff',
                          borderColor: isDark ? '#38bdf8' : '#0284c7',
                          color: isDark ? '#f4f4f5' : '#0f172a',
                          boxShadow: '0 20px 35px -10px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(56, 189, 248, 0.4)'
                        }}
                        className="slot-popover-container z-[9999] p-2.5 rounded-xl border shadow-2xl animate-in fade-in zoom-in-95 duration-100 select-none"
                      >
                        {/* Caret Down Arrow pointing directly down to the slot button */}
                        <div 
                          style={{ 
                            left: `${typeof window !== 'undefined' ? Math.max(16, Math.min(252, activeSlotPopover.x - Math.max(12, Math.min(window.innerWidth - 280, activeSlotPopover.x - 134)))) : 134}px`,
                            borderTopColor: isDark ? '#38bdf8' : '#0284c7'
                          }} 
                          className="absolute top-full -mt-[1px] -translate-x-1/2 w-0 h-0 border-x-5 border-x-transparent border-t-6"
                        />

                        {/* Compact Header Bar */}
                        {(() => {
                          const currentGateOnSlot = circuitGates.find(
                            g => g.qubit === activeSlotPopover.qubit && g.step === activeSlotPopover.step
                          );

                          return (
                            <>
                              <div className="flex items-center justify-between pb-1.5 mb-2 border-b text-[11px] font-mono" style={{ borderColor: isDark ? '#27272a' : '#e2e8f0' }}>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-sky-400">q[{activeSlotPopover.qubit}]·t{activeSlotPopover.step}</span>
                                  {currentGateOnSlot ? (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] bg-sky-500/20 text-sky-400 border border-sky-500/30 font-bold uppercase">
                                      {currentGateOnSlot.name}
                                    </span>
                                  ) : (
                                    <span className="text-zinc-400 text-[10px] font-sans">Pick gate:</span>
                                  )}
                                </div>
                                <button
                                  onClick={() => setActiveSlotPopover(null)}
                                  className="text-zinc-400 hover:text-zinc-200 transition-colors p-0.5 rounded cursor-pointer"
                                  title="Close"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              {/* ── 3 COMPACT ROWS OF 6 GATES (EXPLICIT INLINE CSS GRID) ── */}
                              <div className="space-y-1.5">
                                {/* Row 1 (6 gates): Pauli & Phase */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '4px' }}>
                                  {[
                                    { id: 'h', label: 'H' },
                                    { id: 'x', label: 'X' },
                                    { id: 'y', label: 'Y' },
                                    { id: 'z', label: 'Z' },
                                    { id: 's', label: 'S' },
                                    { id: 't', label: 'T' }
                                  ].map(g => (
                                    <button
                                      key={g.id}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handlePlaceGateOnSlot(g.id, activeSlotPopover.qubit, activeSlotPopover.step);
                                      }}
                                      style={{ height: '28px' }}
                                      className={`rounded-md border font-mono font-bold text-xs flex items-center justify-center transition-all cursor-pointer ${
                                        currentGateOnSlot?.name === g.id 
                                          ? 'bg-sky-500 border-sky-400 text-white shadow-xs' 
                                          : (isDark ? 'border-zinc-700/80 bg-zinc-800/90 text-zinc-100 hover:border-sky-400 hover:text-sky-300 hover:bg-zinc-700/90' : 'border-slate-300 bg-slate-50 text-slate-800 hover:border-sky-500 hover:text-sky-700 hover:bg-white shadow-2xs')
                                      }`}
                                      title={g.label}
                                    >
                                      {g.label}
                                    </button>
                                  ))}
                                </div>

                                {/* Row 2 (6 gates): Rotations & Entanglement */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '4px' }}>
                                  {[
                                    { id: 'rx', label: 'Rx' },
                                    { id: 'ry', label: 'Ry' },
                                    { id: 'rz', label: 'Rz' },
                                    { id: 'cx', label: 'CX' },
                                    { id: 'cz', label: 'CZ' },
                                    { id: 'swap', label: 'SW' }
                                  ].map(g => (
                                    <button
                                      key={g.id}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handlePlaceGateOnSlot(g.id, activeSlotPopover.qubit, activeSlotPopover.step);
                                      }}
                                      style={{ height: '28px' }}
                                      className={`rounded-md border font-mono font-bold text-xs flex items-center justify-center transition-all cursor-pointer ${
                                        currentGateOnSlot?.name === g.id 
                                          ? 'bg-sky-500 border-sky-400 text-white shadow-xs' 
                                          : (isDark ? 'border-zinc-700/80 bg-zinc-800/90 text-zinc-100 hover:border-sky-400 hover:text-sky-300 hover:bg-zinc-700/90' : 'border-slate-300 bg-slate-50 text-slate-800 hover:border-sky-500 hover:text-sky-700 hover:bg-white shadow-2xs')
                                      }`}
                                      title={g.id.toUpperCase()}
                                    >
                                      {g.label}
                                    </button>
                                  ))}
                                </div>

                                {/* Row 3 (6 cols): CCX + Meter + Remove/Clear */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '4px' }}>
                                  {/* Col 1: CCX */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handlePlaceGateOnSlot('ccx', activeSlotPopover.qubit, activeSlotPopover.step);
                                    }}
                                    style={{ height: '28px' }}
                                    className={`rounded-md border font-mono font-bold text-xs flex items-center justify-center transition-all cursor-pointer ${
                                      currentGateOnSlot?.name === 'ccx' 
                                        ? 'bg-purple-600 border-purple-400 text-white shadow-xs' 
                                        : (isDark ? 'border-zinc-700/80 bg-zinc-800/90 text-zinc-100 hover:border-purple-400' : 'border-slate-300 bg-slate-50 text-slate-800 hover:border-purple-500 shadow-2xs')
                                    }`}
                                    title="Toffoli (CCX)"
                                  >
                                    CCX
                                  </button>

                                  {/* Col 2-3 (span 2): Meter */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handlePlaceGateOnSlot('measure', activeSlotPopover.qubit, activeSlotPopover.step);
                                    }}
                                    style={{ height: '28px', gridColumn: 'span 2' }}
                                    className={`rounded-md border font-mono font-bold text-xs flex items-center justify-center gap-1 transition-all cursor-pointer ${
                                      currentGateOnSlot?.name === 'measure' 
                                        ? 'bg-cyan-600 border-cyan-400 text-white shadow-xs' 
                                        : (isDark ? 'border-cyan-500/60 bg-cyan-950/60 text-cyan-300 hover:border-cyan-400' : 'border-cyan-400 bg-cyan-50 text-cyan-800 hover:border-cyan-500')
                                    }`}
                                    title="Measurement Meter"
                                  >
                                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M4 16a8 8 0 0 1 16 0" />
                                      <line x1="12" y1="16" x2="16" y2="9" />
                                      <circle cx="12" cy="16" r="1.5" fill="currentColor" />
                                    </svg>
                                    <span className="text-[11px]">Meter</span>
                                  </button>

                                  {/* Col 4-6 (span 3): Remove button (if slot occupied) or Dismiss */}
                                  {currentGateOnSlot ? (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemoveGateFromSlot(activeSlotPopover.qubit, activeSlotPopover.step);
                                      }}
                                      style={{ height: '28px', gridColumn: 'span 3' }}
                                      className="text-rose-400 hover:text-rose-300 font-sans font-medium flex items-center justify-center gap-1 cursor-pointer text-xs rounded-md bg-rose-500/10 border border-rose-500/25 hover:bg-rose-500/20 transition-colors"
                                      title="Remove gate from slot"
                                    >
                                      <Trash2 className="w-3 h-3" /> Remove
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => setActiveSlotPopover(null)}
                                      style={{ height: '28px', gridColumn: 'span 3' }}
                                      className="text-zinc-500 hover:text-zinc-300 font-sans text-xs flex items-center justify-center rounded-md border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-800/60 transition-colors cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                  )}
                                </div>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: QPU TERMINAL */}
                {activeBottomTab === 'terminal' && (
                  <div className="p-3.5 font-mono text-xs h-full flex flex-col min-h-0">
                    {/* Terminal Action Bar */}
                    <div className="flex items-center justify-between pb-2 mb-2 border-b shrink-0 text-[11px] font-sans" style={{ borderColor: colors.border }}>
                      <span className="text-zinc-500 font-mono">QPU Runtime Output</span>
                      <button
                        onClick={() => setTerminalLogs([])}
                        className="flex items-center gap-1 px-2 py-0.5 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors cursor-pointer text-xs"
                        title="Clear terminal output"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Clear</span>
                      </button>
                    </div>

                    {/* Output Lines Stream */}
                    <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
                      {terminalLogs.length === 0 ? (
                        <div className="text-zinc-500 py-6 text-center font-mono text-xs">
                          Terminal is ready. Click "Simulate on Aer" or "Run" to execute your circuit.
                        </div>
                      ) : (
                        terminalLogs.map((log, i) => (
                          <div 
                            key={i} 
                            className={log.startsWith('✔') ? 'text-emerald-400' : (log.startsWith('✖') ? 'text-rose-400' : (log.startsWith('➜') ? 'text-sky-400' : 'text-zinc-300'))}
                          >
                            {log}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 3: MEASUREMENT RESULTS / D-WAVE ENERGY & QUBO SPECTRUM */}
                {activeBottomTab === 'results' && (
                  <div className="p-4 space-y-4 font-sans h-full overflow-y-auto">
                    {optimizationResults ? (
                      <div className="space-y-4">
                        {/* Header with Ground State Summary */}
                        <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl border" style={{ backgroundColor: colors.bgPill, borderColor: colors.border }}>
                          <div className="flex items-center gap-2.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-xs font-semibold" style={{ color: colors.textPrimary }}>
                              Optimal Ground State Energy:
                            </span>
                            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                              {optimizationResults.energy}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] font-mono" style={{ color: colors.textMuted }}>
                            <span>Variables: <strong style={{ color: colors.textPrimary }}>{optimizationResults.num_variables || (optimizationResults.variables ? optimizationResults.variables.length : 0)}</strong></span>
                            <span>Reads: <strong style={{ color: colors.textPrimary }}>{optimizationResults.num_reads || shots}</strong></span>
                            <span className="px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/30">dwave_simulated_annealing</span>
                          </div>
                        </div>

                        {/* Cloud Rerouted Notice Banner */}
                        {optimizationResults.cloud_rerouted && (
                          <div className="p-2.5 rounded-lg border border-sky-500/30 bg-sky-500/10 flex items-center gap-2 text-xs text-sky-300">
                            <span className="font-bold">ℹ️ Offline Sandbox:</span>
                            <span>Cloud QPU sampler detected without active Leap credentials. Execution was seamlessly rerouted to local SimulatedAnnealingSampler for Phase 2 offline simulation.</span>
                          </div>
                        )}

                        {/* Two-Column Grid: Energy Spectrum + Q-Matrix Heatmap */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          {/* Column A: Interactive Energy Spectrum & Sample Distribution */}
                          <div className="p-3.5 rounded-xl border space-y-3" style={{ backgroundColor: colors.bgCard, borderColor: colors.border }}>
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold flex items-center gap-1.5" style={{ color: colors.textAmber }}>
                                <span>⚡</span> Energy Spectrum & Sample Distribution
                              </span>
                              <span className="text-[10px] font-mono" style={{ color: colors.textMuted }}>
                                Top Low-Energy States
                              </span>
                            </div>

                            <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                              {optimizationResults.energy_distribution && optimizationResults.energy_distribution.length > 0 ? (
                                optimizationResults.energy_distribution.map((item: any, idx: number) => {
                                  const isGround = idx === 0;
                                  const maxOcc = Math.max(...(optimizationResults.energy_distribution || []).map((d: any) => d.num_occurrences || 1));
                                  const occPct = Math.max(12, Math.round(((item.num_occurrences || 1) / maxOcc) * 100));

                                  return (
                                    <div
                                      key={idx}
                                      style={{ backgroundColor: colors.bgPill, borderColor: isGround ? 'rgba(52, 211, 153, 0.4)' : colors.border }}
                                      className={`p-2.5 rounded-lg border transition-all ${isGround ? 'shadow-xs' : ''}`}
                                    >
                                      <div className="flex items-center justify-between text-xs font-mono mb-1">
                                        <div className="flex items-center gap-1.5">
                                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${isGround ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-neutral-800 text-neutral-400'}`}>
                                            {isGround ? 'GROUND' : `#${idx + 1}`}
                                          </span>
                                          <span className="text-sky-400 font-semibold truncate max-w-[140px]" title={JSON.stringify(item.sample)}>
                                            {item.bitstring ? `|${item.bitstring}⟩` : JSON.stringify(item.sample)}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span style={{ color: colors.textPrimary }}>E = {item.energy}</span>
                                          <span className="text-[10px]" style={{ color: colors.textMuted }}>({item.num_occurrences || 1} hits)</span>
                                        </div>
                                      </div>
                                      <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                                        <div
                                          className={`h-full rounded-full transition-all ${isGround ? 'bg-emerald-400' : 'bg-sky-400'}`}
                                          style={{ width: `${occPct}%` }}
                                        />
                                      </div>
                                    </div>
                                  );
                                })
                              ) : (
                                <div className="p-3 rounded-lg border text-xs font-mono" style={{ backgroundColor: colors.bgPill, borderColor: colors.border }}>
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-emerald-400 font-bold">Ground State:</span>
                                    <span>E = {optimizationResults.energy}</span>
                                  </div>
                                  <pre className="text-[11px] mt-2 text-neutral-300 overflow-x-auto">
                                    {JSON.stringify(optimizationResults.sample, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Column B: Interactive Q-Matrix Heatmap */}
                          <div className="p-3.5 rounded-xl border space-y-3" style={{ backgroundColor: colors.bgCard, borderColor: colors.border }}>
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold flex items-center gap-1.5" style={{ color: colors.textCyan }}>
                                <span>🧊</span> Quadratic Matrix (Q-Matrix) Heatmap
                              </span>
                              <span className="text-[10px] font-mono" style={{ color: colors.textMuted }}>
                                {optimizationResults.variables ? `${optimizationResults.variables.length}×${optimizationResults.variables.length}` : ''}
                              </span>
                            </div>

                            {optimizationResults.qubo_matrix && optimizationResults.variables && optimizationResults.variables.length > 0 ? (
                              <div className="space-y-3">
                                <div className="overflow-x-auto max-h-[260px] overflow-y-auto">
                                  <table className="w-full border-collapse font-mono text-xs text-center">
                                    <thead>
                                      <tr>
                                        <th className="p-1.5 text-left text-[10px] border-b" style={{ borderColor: colors.border, color: colors.textMuted }}>
                                          Var
                                        </th>
                                        {optimizationResults.variables.map((v: string, idx: number) => (
                                          <th key={idx} className="p-1.5 text-[10px] border-b font-semibold" style={{ borderColor: colors.border, color: colors.textPrimary }}>
                                            {v}
                                          </th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {optimizationResults.qubo_matrix.map((row: number[], rIdx: number) => {
                                        const rVar = (optimizationResults.variables || [])[rIdx];
                                        return (
                                          <tr key={rIdx} className="hover:bg-sky-500/5 transition-colors">
                                            <td className="p-1.5 text-left text-[10px] font-semibold border-r" style={{ borderColor: colors.border, color: colors.textPrimary }}>
                                              {rVar}
                                            </td>
                                            {row.map((val: number, cIdx: number) => {
                                              const isDiag = rIdx === cIdx;
                                              const cVar = (optimizationResults.variables || [])[cIdx];
                                              const isNegative = val < 0;
                                              const isPositive = val > 0;
                                              const isZero = val === 0;

                                              let bg = 'rgba(39, 39, 42, 0.4)';
                                              let fg = colors.textMuted;
                                              if (isDiag) {
                                                bg = isNegative ? 'rgba(56, 189, 248, 0.25)' : isPositive ? 'rgba(251, 146, 60, 0.25)' : 'rgba(39, 39, 42, 0.6)';
                                                fg = isNegative ? '#38bdf8' : isPositive ? '#fb923c' : colors.textPrimary;
                                              } else if (!isZero) {
                                                bg = isNegative ? 'rgba(56, 189, 248, 0.15)' : 'rgba(244, 63, 94, 0.15)';
                                                fg = isNegative ? '#7dd3fc' : '#fda4af';
                                              }

                                              return (
                                                <td
                                                  key={cIdx}
                                                  onClick={() => setSelectedQuboCell({ row: rIdx, col: cIdx, val })}
                                                  style={{ backgroundColor: bg, color: fg, borderColor: colors.border }}
                                                  className="p-1.5 border text-[11px] cursor-pointer hover:ring-1 hover:ring-sky-400 transition-all font-mono"
                                                  title={`${isDiag ? `Linear bias h(${rVar})` : `Coupling J(${rVar}, ${cVar})`}: ${val}`}
                                                >
                                                  {val !== 0 ? val.toFixed(1) : '·'}
                                                </td>
                                              );
                                            })}
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>

                                {/* Selected Cell Inspector */}
                                {selectedQuboCell && optimizationResults.variables && selectedQuboCell.row < optimizationResults.variables.length && selectedQuboCell.col < optimizationResults.variables.length && (
                                  <div className="p-2.5 rounded-lg border text-[11px] font-mono space-y-1" style={{ backgroundColor: colors.bgPill, borderColor: colors.border }}>
                                    <div className="flex items-center justify-between">
                                      <span className="font-semibold text-sky-400">
                                        {selectedQuboCell.row === selectedQuboCell.col
                                          ? `Linear Bias: h(${optimizationResults.variables[selectedQuboCell.row]})`
                                          : `Coupling: J(${optimizationResults.variables[selectedQuboCell.row]}, ${optimizationResults.variables[selectedQuboCell.col]})`}
                                      </span>
                                      <span className="font-bold" style={{ color: colors.textPrimary }}>
                                        Value = {selectedQuboCell.val !== undefined ? selectedQuboCell.val : (optimizationResults.qubo_matrix?.[selectedQuboCell.row]?.[selectedQuboCell.col])}
                                      </span>
                                    </div>
                                    <div className="text-[10px]" style={{ color: colors.textMuted }}>
                                      {selectedQuboCell.row === selectedQuboCell.col
                                        ? `Hamiltonian linear energy: h · x_${optimizationResults.variables[selectedQuboCell.row]}`
                                        : `Quadratic interaction: J · x_${optimizationResults.variables[selectedQuboCell.row]} · x_${optimizationResults.variables[selectedQuboCell.col]}`}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-center py-6 text-xs text-zinc-500 font-mono">
                                No matrix representation extracted.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : simulationCounts ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold" style={{ color: colors.textAmber }}>Measurement Statevector Probability Distribution</span>
                          <span className="text-[11px] font-mono" style={{ color: colors.textMuted }}>Total Shots: {shots}</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                          {Object.entries(simulationCounts).map(([state, cnt]) => {
                            const pct = Math.round((cnt / (shots || 1024)) * 100);
                            return (
                              <div
                                key={state}
                                style={{ backgroundColor: colors.bgPill, borderColor: colors.border }}
                                className="p-3 rounded-xl border space-y-1.5 shadow-xs"
                              >
                                <div className="flex items-center justify-between text-xs font-mono">
                                  <span className="font-semibold text-sky-400">|{state}⟩</span>
                                  <span style={{ color: colors.textMuted }}>{cnt} shots</span>
                                </div>
                                <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                                  <div className="bg-sky-400 h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
                                </div>
                                <div className="text-right text-[10px] font-mono text-zinc-400">{pct}% probability</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-6 text-xs text-zinc-500 font-mono">
                        No simulation results yet. Click "Run" or "Simulate on Aer" above.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>


        </div>

        </div>
      </div>

      {/* ── DRAGGABLE RESIZER FOR SECTION 3 (RIGHT) ── */}
      {isRightOpen && (
        <div 
          onMouseDown={handleRightMouseDown}
          className="w-1.5 hover:w-2 bg-transparent hover:bg-sky-500/30 active:bg-sky-500 cursor-col-resize z-30 transition-all shrink-0 flex items-center justify-center -mr-0.5 group"
          title="Drag to resize Section 3 width"
        >
          <div style={{ backgroundColor: colors.border }} className="w-0.5 h-6 rounded group-hover:bg-sky-500" />
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* SECTION 3 (RIGHT): AGENTIC QUANTUM COPILOT (FULL HEIGHT)     */}
      {/* ─────────────────────────────────────────────────────────── */}
      {isRightOpen ? (
        <aside 
          style={{ 
            width: `${rightWidth}px`, 
            backgroundColor: colors.bgSection3, 
            borderColor: colors.border 
          }}
          className="border-l flex flex-col shrink-0 h-full relative transition-[width] duration-0 z-20"
        >
          {/* Section 3 Header: Full-Height Header Flush with Top Nav (h-12) */}
          <div 
            style={{ backgroundColor: colors.bgSection3, borderColor: colors.border }}
            className="h-12 px-3.5 border-b flex items-center justify-between shrink-0 select-none shadow-xs"
          >
            <span className="font-normal text-sm tracking-tight font-heading" style={{ color: colors.textPrimary }}>
              Quantum Copilot
            </span>
            <span 
              style={{ backgroundColor: colors.bgPill, borderColor: colors.border, color: colors.textCyan }}
              className="text-[10px] font-mono px-2 py-0.5 rounded border"
              title={`Active workspace context: ${activeFile}`}
            >
              {activeFile}
            </span>
          </div>

            {/* Conversation Stream & Tool Execution Cards */}
            <div className="flex-1 p-3 overflow-y-auto space-y-3 text-sm">
              {chatMessages.map((msg) => (
                <div key={msg.id} className="space-y-2">
                  {msg.sender === 'user' ? (
                    <div 
                      style={{ backgroundColor: colors.bgCard, borderColor: colors.border }}
                      className="border rounded-xl p-3 shadow-2xs font-normal"
                    >
                      <div className="leading-relaxed" style={{ color: colors.textPrimary }}>{msg.text}</div>
                    </div>
                  ) : (
                    <div 
                      style={{ backgroundColor: 'transparent' }}
                      className="px-1 py-1.5 space-y-2.5 font-normal"
                    >
                      {/* Intermediate Derivation & Tool Workflow Steps Card */}
                      {msg.workflowSteps && msg.workflowSteps.length > 0 && (
                        <div 
                          style={{ 
                            backgroundColor: colors.bgPill, 
                            borderColor: colors.border 
                          }}
                          className="border rounded-xl p-3 space-y-2 shadow-2xs font-normal text-xs"
                        >
                          <div 
                            onClick={() => setExpandedTraces(prev => ({ ...prev, [msg.id]: !prev[msg.id] }))}
                            className="flex items-center justify-between cursor-pointer select-none group"
                          >
                            <div className="flex items-center gap-2 font-mono text-[11px]" style={{ color: colors.textCyan }}>
                              <CheckCircle2 className="w-3.5 h-3.5" style={{ color: colors.textEmerald }} />
                              <span className="font-semibold">Pipeline Derivation Trace ({msg.workflowSteps.length} Steps)</span>
                            </div>
                            <div className="flex items-center gap-1 text-[10px] font-mono" style={{ color: colors.textMuted }}>
                              <span>{expandedTraces[msg.id] !== false ? 'Hide' : 'Show'}</span>
                              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${expandedTraces[msg.id] !== false ? 'rotate-180' : ''}`} />
                            </div>
                          </div>

                          {expandedTraces[msg.id] !== false && (
                            <div className="space-y-1.5 pt-1.5 border-t font-mono text-[11px]" style={{ borderColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' }}>
                              {msg.workflowSteps.map((step, sIdx) => (
                                <div key={sIdx} className="flex items-start gap-2 p-1.5 rounded-lg bg-black/20 border" style={{ borderColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)' }}>
                                  <span style={{ color: colors.textEmerald }} className="mt-0.5 font-bold">✓</span>
                                  <div className="flex-1 space-y-0.5 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="font-semibold text-[11px]" style={{ color: colors.textPrimary }}>
                                        {step.step_num}. {step.name}
                                      </span>
                                      {step.execution_time_ms > 0 && (
                                        <span className="text-[10px]" style={{ color: colors.textMuted }}>
                                          {step.execution_time_ms}ms
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[11px] leading-relaxed font-sans" style={{ color: colors.textMuted }}>
                                      {step.summary}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="leading-relaxed font-normal font-sans overflow-hidden" style={{ color: colors.textPrimary }}>
                        <IdeMarkdownRenderer content={msg.text} isDark={isDark} />
                      </div>

                      {/* Interactive Domain Clarification Question Card */}
                      {msg.clarification && (
                        <div 
                          style={{ 
                            backgroundColor: colors.bgPill, 
                            borderColor: isDark ? 'rgba(51, 168, 219, 0.4)' : 'rgba(51, 168, 219, 0.5)' 
                          }}
                          className="border rounded-xl p-3.5 space-y-3 shadow-2xs font-normal animate-in fade-in zoom-in-95 duration-100"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider font-semibold" style={{ color: colors.textCyan }}>
                              <HelpCircle className="w-3.5 h-3.5" style={{ color: colors.textCyan }} />
                              <span>Decision Required: {msg.clarification.domain} Configuration</span>
                            </div>
                            {msg.clarification.default_value && (
                              <span className="text-[10px] font-mono" style={{ color: colors.textMuted }}>
                                Default: <span style={{ color: colors.textSkyBlue }}>{msg.clarification.default_value}</span>
                              </span>
                            )}
                          </div>

                          <div className="text-xs font-semibold leading-relaxed font-sans" style={{ color: colors.textPrimary }}>
                            {msg.clarification.question}
                          </div>

                          {/* Selectable Option Pills */}
                          <div className="space-y-1.5 pt-1">
                            {(msg.clarification.options || []).map((opt, idx) => (
                              <button
                                key={idx}
                                onClick={() => handleSendMessage(opt.label)}
                                style={{ 
                                  backgroundColor: colors.bgCard, 
                                  borderColor: opt.is_recommended 
                                    ? (isDark ? 'rgba(47, 184, 133, 0.45)' : 'rgba(47, 184, 133, 0.6)') 
                                    : colors.border,
                                  color: colors.textPrimary 
                                }}
                                className="w-full text-left p-2.5 rounded-lg border hover:border-sky-500 transition-all cursor-pointer group flex flex-col gap-0.5 shadow-2xs"
                              >
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-normal font-sans group-hover:text-sky-400 transition-colors">
                                    {opt.label}
                                  </span>
                                  {opt.is_recommended && (
                                    <span 
                                      style={{ 
                                        backgroundColor: isDark ? 'rgba(47, 184, 133, 0.15)' : 'rgba(47, 184, 133, 0.2)',
                                        color: colors.textEmerald,
                                        borderColor: 'rgba(47, 184, 133, 0.3)' 
                                      }}
                                      className="text-[10px] font-mono px-1.5 py-0.2 rounded border font-normal"
                                    >
                                      ★ Recommended
                                    </span>
                                  )}
                                </div>
                                {opt.description && (
                                  <div className="text-[11px] font-normal leading-relaxed" style={{ color: colors.textMuted }}>
                                    {opt.description}
                                  </div>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Code Mutation Summary Card */}
                      {msg.codeMutation && (
                        <div 
                          style={{ 
                            backgroundColor: colors.bgPill, 
                            borderColor: isDark ? 'rgba(51, 168, 219, 0.3)' : 'rgba(51, 168, 219, 0.4)' 
                          }}
                          className="border rounded-xl p-3 space-y-2 shadow-2xs font-normal"
                        >
                          <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                            {/* Left: Clickable Target File Badge */}
                            <button
                              onClick={() => setActiveFile(msg.codeMutation!.fileName)}
                              title={`Click to focus ${msg.codeMutation!.fileName} in code editor`}
                              style={{ 
                                backgroundColor: colors.bgCard, 
                                borderColor: colors.border, 
                                color: colors.textCyan 
                              }}
                              className="px-2.5 py-1 rounded-md border flex items-center gap-1.5 font-mono text-[11px] hover:border-sky-400 transition-colors cursor-pointer"
                            >
                              <FileCode className="w-3.5 h-3.5" style={{ color: colors.textCyan }} />
                              <span className="font-normal">{msg.codeMutation.fileName}</span>
                            </button>

                            {/* Right: Line Diff Counts & Sync Badge */}
                            <div className="flex items-center gap-2 font-mono text-[11px]">
                              {msg.codeMutation.linesAdded > 0 && (
                                <span style={{ color: colors.textEmerald }} className="flex items-center gap-0.5 font-normal">
                                  +{msg.codeMutation.linesAdded} lines
                                </span>
                              )}
                              {msg.codeMutation.linesRemoved > 0 && (
                                <span style={{ color: colors.textAmber }} className="flex items-center gap-0.5 font-normal">
                                  -{msg.codeMutation.linesRemoved} lines
                                </span>
                              )}
                              <span 
                                style={{ 
                                  backgroundColor: colors.bgCard, 
                                  color: colors.textEmerald, 
                                  borderColor: 'rgba(47, 184, 133, 0.35)' 
                                }}
                                className="px-2 py-0.5 rounded border text-[10px] font-normal flex items-center gap-1"
                              >
                                <Check className="w-3 h-3" style={{ color: colors.textEmerald }} />
                                <span>AST Mutated & Synced</span>
                              </span>
                            </div>
                          </div>

                          {/* Mutation Summary Note */}
                          {msg.codeMutation.summary && (
                            <div className="text-[11px] leading-relaxed font-sans" style={{ color: colors.textMuted }}>
                              {msg.codeMutation.summary}
                            </div>
                          )}

                          {/* Quick Execute Button */}
                          <div className="pt-1.5 flex items-center justify-end border-t" style={{ borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)' }}>
                            <button
                              onClick={() => handleSendMessage('/execute@program')}
                              style={{ 
                                backgroundColor: isDark ? 'rgba(222, 170, 33, 0.15)' : 'rgba(222, 170, 33, 0.2)',
                                borderColor: 'rgba(222, 170, 33, 0.4)',
                                color: colors.textAmber
                              }}
                              className="px-3 py-1 rounded-md border text-[11px] font-mono flex items-center gap-1.5 hover:border-amber-400 cursor-pointer transition-all shadow-2xs font-normal"
                            >
                              <Play className="w-3 h-3 fill-current" style={{ color: colors.textAmber }} />
                              <span>Run Program on {targetBackend}</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {msg.toolCall && (
                        <div 
                          style={{ backgroundColor: colors.bgPill, borderColor: colors.border }}
                          className="border rounded-lg p-2.5 space-y-1"
                        >
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-normal flex items-center gap-1 font-heading" style={{ color: colors.textPrimary }}>
                              <Check className="w-3 h-3" style={{ color: colors.textEmerald }} /> {msg.toolCall.name}
                            </span>
                            <span 
                              style={{ 
                                backgroundColor: colors.bgCard, 
                                borderColor: colors.border,
                                color: colors.textEmerald 
                              }}
                              className="font-mono px-1.5 py-0.5 rounded font-normal text-[9px] border"
                            >
                              {msg.toolCall.badge}
                            </span>
                          </div>
                          <div className="text-[10px] font-mono" style={{ color: colors.textMuted }}>
                            {msg.toolCall.detail}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {isCopilotThinking && (
                <div 
                  style={{ backgroundColor: 'transparent' }}
                  className="p-3 space-y-1.5 animate-pulse font-normal"
                >
                  <div className="flex items-center gap-2 text-[10px] font-normal" style={{ color: colors.textCyan }}>
                    <Sparkles className="w-3.5 h-3.5 animate-spin" />
                    <span>Quantum Copilot is inspecting `{activeFile}`, dispatching tools & compiling telemetry...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Copilot Input Box (Isolated Component: Zero Root Re-renders on Keystrokes) */}
            <CopilotChatInput 
              onSend={handleSendMessage}
              isThinking={isCopilotThinking}
              colors={colors}
              isDark={isDark}
              activeFile={activeFile}
            />
          </aside>
      ) : null}



      {/* ───────────────────────────────────────────────────────────── */}
      {/* SETTINGS MODAL                                                */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isSettingsOpen && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setIsSettingsOpen(false); }}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-hidden animate-in fade-in duration-150"
        >
          <div 
            style={{ backgroundColor: colors.bgCard, borderColor: colors.border, color: colors.textPrimary }}
            className="border rounded-2xl shadow-2xl w-full max-w-xl max-h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
          >
            {/* Header */}
            <div 
              style={{ backgroundColor: colors.bgHeader, borderColor: colors.border }}
              className="px-5 py-3.5 border-b flex items-center justify-between"
            >
              <div>
                <h3 className="text-sm font-normal font-heading" style={{ color: colors.textCyan }}>Quantum Environment Settings</h3>
                <p className="text-[11px]" style={{ color: colors.textMuted }}>Configure AI copilot models, theme appearance, target backends, and compiler passes</p>
              </div>
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-75 transition-opacity cursor-pointer"
                style={{ color: colors.textMuted }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-5 overflow-y-auto max-h-[75vh] text-xs">
              
              {/* User Profile & Account */}
              <div className="space-y-2.5">
                <div className="text-xs font-normal uppercase tracking-wider font-heading" style={{ color: colors.textCyan }}>
                  User Profile & Account
                </div>
                <div 
                  style={{ backgroundColor: colors.bgPill, borderColor: colors.border }}
                  className="p-3.5 rounded-xl border flex items-center justify-between shadow-2xs"
                >
                  <div className="flex items-center gap-3">
                    <div 
                      style={{ backgroundColor: colors.bgCard, color: colors.textCyan, borderColor: 'rgba(51, 168, 219, 0.4)' }}
                      className="w-10 h-10 rounded-full border flex items-center justify-center text-sm font-normal font-heading shrink-0"
                    >
                      QD
                    </div>
                    <div>
                      <div className="text-sm font-normal" style={{ color: colors.textPrimary }}>Quantum Dev</div>
                      <div className="text-xs font-mono" style={{ color: colors.textMuted }}>ms@qc.guru</div>
                    </div>
                  </div>
                  <span 
                    style={{ backgroundColor: colors.bgCard, color: colors.textEmerald, borderColor: colors.border }}
                    className="text-[10px] font-mono px-2.5 py-1 rounded-md border font-normal"
                  >
                    Pro Developer
                  </span>
                </div>
              </div>

              {/* Theme */}
              <div className="space-y-2.5">
                <div className="text-xs font-normal uppercase tracking-wider font-heading" style={{ color: colors.textCyan }}>
                  Theme Appearance
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div 
                    onClick={() => setTheme('dark')}
                    style={{ 
                      backgroundColor: isDark ? colors.bgPill : 'transparent',
                      borderColor: isDark ? colors.textCyan : colors.border,
                      color: colors.textPrimary
                    }}
                    className="p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2 font-normal">
                      <Moon className="w-4 h-4" style={{ color: colors.textAmber }} />
                      <span>Dark Theme</span>
                    </div>
                    {isDark && <Check className="w-3.5 h-3.5" style={{ color: colors.textEmerald }} />}
                  </div>

                  <div 
                    onClick={() => setTheme('light')}
                    style={{ 
                      backgroundColor: !isDark ? colors.bgPill : 'transparent',
                      borderColor: !isDark ? colors.textCyan : colors.border,
                      color: colors.textPrimary
                    }}
                    className="p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2 font-normal">
                      <Sun className="w-4 h-4" style={{ color: colors.textAmber }} />
                      <span>Light Theme</span>
                    </div>
                    {!isDark && <Check className="w-3.5 h-3.5" style={{ color: colors.textEmerald }} />}
                  </div>
                </div>
              </div>

              {/* AI Copilot Model */}
              <div style={{ borderColor: colors.border }} className="space-y-2.5 pt-2 border-t">
                <div className="text-xs font-normal uppercase tracking-wider font-heading" style={{ color: colors.textCyan }}>
                  AI Copilot Inference Engine
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div 
                    onClick={() => setActiveModel('groq')}
                    style={{ 
                      backgroundColor: activeModel === 'groq' ? colors.bgPill : 'transparent',
                      borderColor: activeModel === 'groq' ? colors.textCyan : colors.border,
                      color: colors.textPrimary
                    }}
                    className="p-3 rounded-xl border cursor-pointer transition-all"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-normal" style={{ color: colors.textAmber }}>Groq (Llama-3.3)</span>
                      {activeModel === 'groq' && <Check className="w-3.5 h-3.5" style={{ color: colors.textEmerald }} />}
                    </div>
                    <p style={{ color: colors.textMuted }} className="text-[11px] leading-relaxed">
                      Ultra-low latency streaming (~120ms), instant AST code edits, and rapid tool execution.
                    </p>
                  </div>

                  <div 
                    onClick={() => setActiveModel('runpod')}
                    style={{ 
                      backgroundColor: activeModel === 'runpod' ? colors.bgPill : 'transparent',
                      borderColor: activeModel === 'runpod' ? colors.textCyan : colors.border,
                      color: colors.textPrimary
                    }}
                    className="p-3 rounded-xl border cursor-pointer transition-all"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-normal" style={{ color: colors.textAmber }}>RunPod (Qwen-27B)</span>
                      {activeModel === 'runpod' && <Check className="w-3.5 h-3.5" style={{ color: colors.textEmerald }} />}
                    </div>
                    <p style={{ color: colors.textMuted }} className="text-[11px] leading-relaxed">
                      Deep mathematical rigor, Hamiltonian parsing, and specialized quantum domain weights.
                    </p>
                  </div>
                </div>
              </div>

              {/* Backend */}
              <div style={{ borderColor: colors.border }} className="space-y-2.5 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-normal uppercase tracking-wider font-heading" style={{ color: colors.textCyan }}>
                    Target Execution Backend
                  </div>
                  <span 
                    style={{ 
                      backgroundColor: colors.bgPill, 
                      color: colors.textSkyBlue,
                      borderColor: colors.border 
                    }} 
                    className="text-[10px] font-mono px-2 py-0.5 rounded border font-normal"
                  >
                    Active: {targetBackend}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2 font-mono">
                  {[
                    { id: 'aer_simulator', label: 'AerSimulator', desc: 'Local C++ Simulator' },
                    { id: 'statevector', label: 'Statevector', desc: 'Exact Statevector' },
                    { id: 'dwave_simulated_annealing', label: 'D-Wave Annealer', desc: 'QUBO & Ising Sampler' },
                    { id: 'ibm_heron', label: 'IBM Heron QPU', desc: 'Cloud QPU Bridge' }
                  ].map((b) => (
                    <div 
                      key={b.id}
                      onClick={() => setTargetBackend(b.id)}
                      style={{ 
                        backgroundColor: targetBackend === b.id ? colors.bgPill : 'transparent',
                        borderColor: targetBackend === b.id ? colors.textCyan : colors.border,
                        color: colors.textPrimary
                      }}
                      className="p-2.5 rounded-lg border text-center cursor-pointer transition-all"
                    >
                      <div className="text-xs font-normal" style={{ color: targetBackend === b.id ? colors.textCyan : colors.textPrimary }}>{b.label}</div>
                      <div className="text-[9px] font-sans mt-0.5" style={{ color: colors.textMuted }}>{b.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Transpiler */}
              <div style={{ borderColor: colors.border }} className="space-y-2.5 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-normal uppercase tracking-wider font-heading" style={{ color: colors.textCyan }}>
                    Compiler Optimization Level
                  </div>
                  <span 
                    style={{ 
                      backgroundColor: colors.bgPill, 
                      color: colors.textAmber, 
                      borderColor: colors.border 
                    }} 
                    className="font-mono text-xs font-normal px-2 py-0.5 rounded border"
                  >
                    Level {optimizationLevel}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center font-mono">
                  {[0, 1, 2, 3].map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => setOptimizationLevel(lvl)}
                      style={{ 
                        backgroundColor: optimizationLevel === lvl ? colors.bgPill : 'transparent',
                        borderColor: optimizationLevel === lvl ? colors.textAmber : colors.border,
                        color: optimizationLevel === lvl ? colors.textAmber : colors.textPrimary
                      }}
                      className="py-1.5 rounded-md border text-xs font-normal transition-all cursor-pointer"
                    >
                      Level {lvl}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* Footer */}
            <div 
              style={{ backgroundColor: colors.bgHeader, borderColor: colors.border }}
              className="px-5 py-3 border-t flex items-center justify-end"
            >
              <button 
                onClick={() => setIsSettingsOpen(false)}
                style={{ backgroundColor: colors.bgPill, color: colors.textCyan, borderColor: colors.border }}
                className="px-4 py-1.5 font-normal text-xs rounded-lg border transition-opacity hover:opacity-80 cursor-pointer"
              >
                Apply & Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* QUANTUM RUNTIME TELEMETRY & SOLVERS DETAILS MODAL              */}
      {/* ───────────────────────────────────────────────────────────── */}
      {telemetryModalTab !== null && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setTelemetryModalTab(null); }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
        >
          <div 
            style={{ backgroundColor: colors.bgCard, borderColor: colors.border, color: colors.textPrimary }}
            className="w-full max-w-4xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150"
          >
            {/* Modal Header with View Switcher Tabs & Close Button */}
            <div 
              style={{ backgroundColor: colors.bgHeader, borderColor: colors.border }}
              className="p-4 border-b flex items-center justify-between shrink-0"
            >
              <div className="flex items-center gap-2 font-mono text-xs">
                <button 
                  onClick={() => setTelemetryModalTab('circuit')}
                  style={{ 
                    backgroundColor: telemetryModalTab === 'circuit' ? colors.bgPill : 'transparent',
                    borderColor: telemetryModalTab === 'circuit' ? colors.textCyan : 'transparent',
                    color: telemetryModalTab === 'circuit' ? colors.textCyan : colors.textMuted 
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-colors cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5" style={{ color: colors.textCyan }} />
                  <span>Circuit Canvas</span>
                </button>

                <button 
                  onClick={() => setTelemetryModalTab('results')}
                  style={{ 
                    backgroundColor: telemetryModalTab === 'results' ? colors.bgPill : 'transparent',
                    borderColor: telemetryModalTab === 'results' ? colors.textEmerald : 'transparent',
                    color: telemetryModalTab === 'results' ? colors.textEmerald : colors.textMuted 
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-colors cursor-pointer"
                >
                  <Activity className="w-3.5 h-3.5" style={{ color: colors.textEmerald }} />
                  <span>Results & Metrics</span>
                </button>

                <button 
                  onClick={() => setTelemetryModalTab('terminal')}
                  style={{ 
                    backgroundColor: telemetryModalTab === 'terminal' ? colors.bgPill : 'transparent',
                    borderColor: telemetryModalTab === 'terminal' ? colors.textAmber : 'transparent',
                    color: telemetryModalTab === 'terminal' ? colors.textAmber : colors.textMuted 
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-colors cursor-pointer"
                >
                  <TerminalIcon className="w-3.5 h-3.5" style={{ color: colors.textAmber }} />
                  <span>Solver Terminal</span>
                </button>
              </div>

              <div className="flex items-center gap-4">
                {/* Real-Time Telemetry Counters */}
                <div className="hidden sm:flex items-center gap-3 text-[11px] font-mono" style={{ color: colors.textMuted }}>
                  <span>Qubits: <span style={{ color: colors.textSkyBlue }}>{runtimeMetrics.activeQubits}</span></span>
                  <span>Depth: <span style={{ color: colors.textSkyBlue }}>{runtimeMetrics.depth}</span></span>
                  <span>CNOTs: <span style={{ color: colors.textSkyBlue }}>{runtimeMetrics.cnots}</span></span>
                </div>

                <button 
                  onClick={() => setTelemetryModalTab(null)}
                  style={{ borderColor: colors.border, color: colors.textMuted }}
                  className="p-1 rounded-md border hover:bg-neutral-800/40 cursor-pointer"
                  title="Close Modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body Content */}
            <div 
              style={{ backgroundColor: colors.bgEditor }}
              className="p-5 flex-1 min-h-0 overflow-y-auto overflow-x-auto font-sans"
            >
              {/* 1. DYNAMIC QUBO MATRIX & PENALTY HEATMAP TAB */}
              {(telemetryModalTab === 'qubo_matrix' || telemetryModalTab === 'annealing' || telemetryModalTab === 'benchmark') && (
                <div className="space-y-5 font-sans">
                  {/* Top Bar: Live Problem Summary & Penalty Multiplier Slider */}
                  <div className="p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4" style={{ backgroundColor: colors.bgCard, borderColor: colors.border }}>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold font-sans" style={{ color: colors.textPrimary }}>
                          {runtimeMetrics.qubo_telemetry?.problem_name || 'Clean energy portfolio optimization'}
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed font-sans" style={{ color: colors.textMuted }}>
                        Symmetric upper-triangular Q-matrix with exact Lagrange constraint expansions: <span className="font-mono">L(x) = -Score + &lambda; &middot; (&sum; C_i x_i - B)&sup2;</span>.
                      </p>
                    </div>

                    {/* Interactive Penalty Multiplier λ Slider */}
                    <div className="flex items-center gap-3 shrink-0 p-2.5 rounded-lg border bg-black/20 font-sans" style={{ borderColor: colors.border }}>
                      <div className="space-y-0.5 text-right">
                        <div className="text-[10px] font-sans" style={{ color: colors.textMuted }}>Penalty multiplier (&lambda;)</div>
                        <div className="text-xs font-mono font-bold" style={{ color: colors.textCyan }}>{quboLambda.toFixed(1)}</div>
                      </div>
                      <input 
                        type="range" 
                        min="1" 
                        max="25" 
                        step="0.5"
                        value={quboLambda}
                        onChange={(e) => setQuboLambda(parseFloat(e.target.value))}
                        className="w-24 accent-sky-400 cursor-pointer"
                        title="Adjust constraint penalty stiffness"
                      />
                      <button 
                        onClick={() => {
                          handleSendMessage(`/execute@program with penalty_lambda=${quboLambda}`);
                        }}
                        style={{ backgroundColor: colors.bgPill, borderColor: colors.border, color: colors.textPrimary }}
                        className="px-2.5 py-1 rounded-md border text-[11px] font-sans hover:border-sky-400 cursor-pointer"
                        title="Re-synthesize Q-matrix with new penalty"
                      >
                        Re-synthesize
                      </button>
                    </div>
                  </div>

                  {/* 2. Interactive N x N Numerical Q-Matrix Grid */}
                  <div className="p-4 rounded-xl border space-y-3" style={{ backgroundColor: colors.bgCard, borderColor: colors.border }}>
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-sans font-semibold" style={{ color: colors.textCyan }}>
                        Numerical Q-matrix heatmap ({runtimeMetrics.qubo_telemetry?.variables?.length || 4}&times;{runtimeMetrics.qubo_telemetry?.variables?.length || 4})
                      </div>
                      <div className="text-[11px] font-sans" style={{ color: colors.textMuted }}>
                        Click any cell to inspect mathematical derivation
                      </div>
                    </div>

                    {/* Matrix Grid Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse font-mono text-xs text-center">
                        <thead>
                          <tr>
                            <th className="p-2 text-left font-mono text-[11px] border-b" style={{ borderColor: colors.border, color: colors.textMuted }}>
                              Variables
                            </th>
                            {(runtimeMetrics.qubo_telemetry?.variables || ['Solar_Farm_A', 'Wind_Farm_C', 'Wind_Farm_D', 'Battery_Storage_E']).map((v: string, idx: number) => (
                              <th key={idx} className="p-2 font-mono text-[11px] border-b font-semibold" style={{ borderColor: colors.border, color: colors.textPrimary }}>
                                x_{idx} ({v.replace('Project_', '').replace('_Farm', '').replace('_Storage', '')})
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {(runtimeMetrics.qubo_telemetry?.qubo_matrix || [
                            [-38.18, 1.0, 10.0, 1.0],
                            [0.0, -43.41, 1.0, -10.0],
                            [0.0, 0.0, -28.86, 1.0],
                            [0.0, 0.0, 0.0, -33.64]
                          ]).map((row: number[], rIdx: number) => {
                            const varName = (runtimeMetrics.qubo_telemetry?.variables || ['Solar_Farm_A', 'Wind_Farm_C', 'Wind_Farm_D', 'Battery_Storage_E'])[rIdx];
                            return (
                              <tr key={rIdx} className="hover:bg-sky-500/5 transition-colors">
                                <td className="p-2.5 text-left font-mono font-semibold border-r" style={{ borderColor: colors.border, color: colors.textSkyBlue }}>
                                  x_{rIdx} ({varName})
                                </td>
                                {row.map((val: number, cIdx: number) => {
                                  const isSelected = selectedQuboCell?.row === rIdx && selectedQuboCell?.col === cIdx;
                                  const isDiag = rIdx === cIdx;
                                  const isPositive = val > 0;
                                  const isNegative = val < 0;

                                  let cellBg = 'bg-black/20';
                                  let cellColor = colors.textMuted;
                                  if (isDiag) {
                                    cellBg = 'bg-sky-500/15';
                                    cellColor = colors.textSkyBlue;
                                  } else if (isPositive) {
                                    cellBg = 'bg-amber-500/15';
                                    cellColor = colors.textAmber;
                                  } else if (isNegative) {
                                    cellBg = 'bg-emerald-500/15';
                                    cellColor = colors.textEmerald;
                                  }

                                  return (
                                    <td 
                                      key={cIdx}
                                      onClick={() => setSelectedQuboCell({ row: rIdx, col: cIdx })}
                                      style={{ borderColor: isSelected ? colors.textCyan : colors.border }}
                                      className={`p-2.5 border cursor-pointer transition-all font-mono font-semibold ${cellBg} ${isSelected ? 'ring-2 ring-sky-400' : ''}`}
                                    >
                                      <span style={{ color: cellColor }}>
                                        {val > 0 ? `+${val.toFixed(2)}` : val.toFixed(2)}
                                      </span>
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Interactive Cell Inspector Box */}
                    <div className="p-3 rounded-xl border bg-black/30 space-y-1 font-mono text-xs" style={{ borderColor: colors.border }}>
                      <div className="flex items-center justify-between text-[11px]" style={{ color: colors.textCyan }}>
                        <span className="font-semibold">
                          🔍 Cell Inspector: {selectedQuboCell ? `Q[${selectedQuboCell.row}, ${selectedQuboCell.col}]` : 'Click any matrix cell above'}
                        </span>
                        {selectedQuboCell && (
                          <span style={{ color: colors.textMuted }}>
                            Row: {(runtimeMetrics.qubo_telemetry?.variables || ['Solar_Farm_A', 'Wind_Farm_C', 'Wind_Farm_D', 'Battery_Storage_E'])[selectedQuboCell.row]} | Col: {(runtimeMetrics.qubo_telemetry?.variables || ['Solar_Farm_A', 'Wind_Farm_C', 'Wind_Farm_D', 'Battery_Storage_E'])[selectedQuboCell.col]}
                          </span>
                        )}
                      </div>
                      <p className="text-xs leading-relaxed font-sans" style={{ color: colors.textPrimary }}>
                        {selectedQuboCell 
                          ? (runtimeMetrics.qubo_telemetry?.cell_explanations?.[`(${selectedQuboCell.row},${selectedQuboCell.col})`] || `Coefficient Q[${selectedQuboCell.row}, ${selectedQuboCell.col}] combines objective linear weight and quadratic penalty couplings.`)
                          : 'Select a diagonal cell (e.g. Q[0,0]) to view the Linear Objective + Budget Penalty, or an off-diagonal cell (e.g. Q[0,2]) to view mutual exclusion / dependency couplings.'
                        }
                      </p>
                    </div>
                  </div>

                  {/* 3. Decision Variables & Constraints List */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl border space-y-2.5 font-sans" style={{ backgroundColor: colors.bgCard, borderColor: colors.border }}>
                      <div className="text-xs font-sans font-semibold" style={{ color: colors.textCyan }}>
                        Decision variables ({runtimeMetrics.qubo_telemetry?.variables?.length || 4})
                      </div>
                      <div className="space-y-1.5 text-xs font-mono">
                        {(runtimeMetrics.qubo_telemetry?.variables || ['Solar_Farm_A', 'Wind_Farm_C', 'Wind_Farm_D', 'Battery_Storage_E']).map((v: string, idx: number) => {
                          const isPicked = (runtimeMetrics.qubo_telemetry?.selected_items || ['Solar_Farm_A', 'Wind_Farm_C', 'Battery_Storage_E']).includes(v);
                          return (
                            <div key={idx} className="flex items-center justify-between p-1.5 rounded-md bg-black/20 border" style={{ borderColor: colors.border }}>
                              <span style={{ color: colors.textPrimary }}>x_{idx}: <strong>{v}</strong></span>
                              <span style={{ color: isPicked ? colors.textEmerald : colors.textMuted }} className="font-semibold">
                                {isPicked ? '✓ Selected (x=1)' : '○ Omitted (x=0)'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="p-4 rounded-xl border space-y-2.5 font-sans" style={{ backgroundColor: colors.bgCard, borderColor: colors.border }}>
                      <div className="text-xs font-sans font-semibold" style={{ color: colors.textCyan }}>
                        Constraints modelled ({runtimeMetrics.qubo_telemetry?.constraints_count || 3})
                      </div>
                      <div className="space-y-1.5 text-xs leading-relaxed font-sans" style={{ color: colors.textMuted }}>
                        <div className="p-2 rounded-lg bg-black/20 border font-sans" style={{ borderColor: colors.border }}>
                          • <strong style={{ color: colors.textPrimary }}>Investment limit:</strong> Total cost &le; ${runtimeMetrics.qubo_telemetry?.budget || 22}M (100% feasible)
                        </div>
                        <div className="p-2 rounded-lg bg-black/20 border font-sans" style={{ borderColor: colors.border }}>
                          • <strong style={{ color: colors.textPrimary }}>Transmission conflict:</strong> Solar A & Wind D mutual exclusion
                        </div>
                        <div className="p-2 rounded-lg bg-black/20 border font-sans" style={{ borderColor: colors.border }}>
                          • <strong style={{ color: colors.textPrimary }}>Grid balancing:</strong> Wind C requires Battery Storage E
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {telemetryModalTab === 'circuit' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: colors.border }}>
                    <div className="text-xs font-normal" style={{ color: colors.textCyan }}>
                      Continuous Horizontal Circuit Canvas (Zero vertical wrapping — scroll horizontally):
                    </div>
                    <div className="text-[10px] font-mono" style={{ color: colors.textMuted }}>
                      Backend: <span style={{ color: colors.textSkyBlue }}>{targetBackend}</span>
                    </div>
                  </div>
                  <pre className="font-mono text-xs font-normal leading-normal select-text p-4 rounded-xl border bg-black/40 overflow-x-auto whitespace-pre" style={{ borderColor: colors.border, color: colors.textPrimary }}>
                    {runtimeMetrics.circuitText}
                  </pre>
                </div>
              )}

              {telemetryModalTab === 'results' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div 
                      style={{ backgroundColor: colors.bgCard, borderColor: colors.border }}
                      className="border rounded-xl p-4 space-y-2 shadow-2xs"
                    >
                      <div className="text-[11px] font-normal font-sans" style={{ color: colors.textCyan }}>Expectation value</div>
                      <div className="text-2xl font-normal font-mono" style={{ color: colors.textSkyBlue }}>{runtimeMetrics.expectationVal}</div>
                      <div className="text-xs font-normal" style={{ color: colors.textMuted }}>Target: Z ⊗ I ⊗ I ⊗ I</div>
                    </div>
                    <div 
                      style={{ backgroundColor: colors.bgCard, borderColor: colors.border }}
                      className="border rounded-xl p-4 space-y-2 shadow-2xs"
                    >
                      <div className="text-[11px] font-normal font-sans" style={{ color: colors.textCyan }}>Simulator fidelity</div>
                      <div className="text-2xl font-normal font-mono" style={{ color: colors.textEmerald }}>{runtimeMetrics.fidelity}</div>
                      <div className="text-xs font-normal" style={{ color: colors.textMuted }}>Statevector exact match</div>
                    </div>
                    <div 
                      style={{ backgroundColor: colors.bgCard, borderColor: colors.border }}
                      className="border rounded-xl p-4 space-y-2 shadow-2xs"
                    >
                      <div className="text-[11px] font-normal font-sans" style={{ color: colors.textCyan }}>Execution latency</div>
                      <div className="text-2xl font-normal font-mono" style={{ color: colors.textAmber }}>{runtimeMetrics.latencySec}</div>
                      <div className="text-xs font-normal" style={{ color: colors.textMuted }}>Target: {targetBackend}</div>
                    </div>
                  </div>

                  <div 
                    style={{ backgroundColor: colors.bgCard, borderColor: colors.border }}
                    className="border rounded-xl p-4 space-y-2"
                  >
                    <div className="text-xs font-normal font-sans" style={{ color: colors.textCyan }}>Quantum execution parameters</div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                      <div><span style={{ color: colors.textMuted }}>Optimization Level:</span> <span style={{ color: colors.textPrimary }}>Level {optimizationLevel}</span></div>
                      <div><span style={{ color: colors.textMuted }}>Shot Count:</span> <span style={{ color: colors.textPrimary }}>{shots} shots</span></div>
                      <div><span style={{ color: colors.textMuted }}>Allocated Qubits:</span> <span style={{ color: colors.textPrimary }}>{runtimeMetrics.activeQubits} Q</span></div>
                      <div><span style={{ color: colors.textMuted }}>Circuit Depth:</span> <span style={{ color: colors.textPrimary }}>{runtimeMetrics.depth} layers</span></div>
                    </div>
                  </div>
                </div>
              )}

              {telemetryModalTab === 'terminal' && (
                <div className="space-y-2 font-mono text-xs">
                  <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: colors.border }}>
                    <span className="text-xs font-normal" style={{ color: colors.textAmber }}>Live QPU Simulation & Solver Console Output:</span>
                    <span className="text-[10px]" style={{ color: colors.textEmerald }}>• Process Exited Cleanly (code 0)</span>
                  </div>
                  <div className="p-4 rounded-xl border bg-black/40 space-y-1 overflow-x-auto" style={{ borderColor: colors.border }}>
                    {(runtimeMetrics?.terminalLog || []).map((line, lIdx) => (
                      <div key={lIdx} style={{ color: line.startsWith('➜') ? colors.textAmber : (line.includes('exit code 0') ? colors.textEmerald : colors.textPrimary) }}>
                        {line}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div 
              style={{ backgroundColor: colors.bgHeader, borderColor: colors.border }}
              className="p-3 border-t flex items-center justify-end"
            >
              <button
                onClick={() => setTelemetryModalTab(null)}
                style={{ backgroundColor: colors.bgPill, borderColor: colors.border, color: colors.textPrimary }}
                className="px-4 py-1.5 rounded-lg border text-xs font-mono hover:opacity-80 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* START NEW PROJECT TEMPLATE SELECTOR MODAL                     */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isNewProjectOpen && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setIsNewProjectOpen(false); }}
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-hidden animate-in fade-in duration-150"
        >
          <div 
            style={{ 
              backgroundColor: isDark ? '#121216' : '#ffffff', 
              borderColor: isDark ? '#27272a' : '#e2e8f0', 
              color: colors.textPrimary 
            }}
            className="border rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
          >
            {/* Header */}
            <div 
              style={{ borderColor: isDark ? '#222226' : '#f1f5f9' }}
              className="px-5 py-4 border-b flex items-center justify-between"
            >
              <div>
                <h3 className="text-sm font-semibold" style={{ color: colors.textPrimary }}>
                  New Quantum Project
                </h3>
                <p className="text-xs mt-0.5" style={{ color: colors.textMuted }}>
                  Scaffold an isolated workspace with runtime configs
                </p>
              </div>
              <button 
                onClick={() => setIsNewProjectOpen(false)}
                style={{ color: colors.textMuted }}
                className="w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-80 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Project Creation Form */}
            <div className="p-5 space-y-4">
              {/* 1. Project Name Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium" style={{ color: isDark ? '#e4e4e7' : '#334155' }}>
                  Project Name
                </label>
                <input 
                  type="text"
                  placeholder="e.g. quantum-portfolio-qaoa"
                  value={customProjectInput}
                  onChange={(e) => setCustomProjectInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCreateCustomProject(); }}
                  style={{ 
                    backgroundColor: isDark ? '#18181D' : '#f8fafc', 
                    borderColor: isDark ? '#2e2e36' : '#e2e8f0', 
                    color: colors.textPrimary 
                  }}
                  className="w-full px-3.5 py-2 rounded-xl border text-xs font-mono transition-all outline-hidden focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                  autoFocus
                />
              </div>

              {/* 2. Quantum Architecture & Paradigm Selection */}
              <div className="space-y-2">
                <label className="text-xs font-medium" style={{ color: isDark ? '#e4e4e7' : '#334155' }}>
                  Architecture & Paradigm
                </label>

                <div className="space-y-2">
                  {/* Row A: Qiskit Gate-Based Circuit */}
                  {(() => {
                    const isQiskit = selectedTemplateKey === 'qiskit-circuit' || selectedTemplateKey === 'my-quantum-project';
                    return (
                      <div
                        onClick={() => setSelectedTemplateKey('qiskit-circuit')}
                        style={{
                          backgroundColor: isQiskit ? (isDark ? '#0c2233' : '#f0f9ff') : (isDark ? '#16161B' : '#ffffff'),
                          borderColor: isQiskit ? (isDark ? '#38bdf8' : '#0284c7') : (isDark ? '#27272a' : '#e2e8f0'),
                        }}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 group ${
                          isQiskit ? 'shadow-xs' : 'hover:opacity-90'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div 
                            style={{
                              backgroundColor: isQiskit ? (isDark ? 'rgba(56, 189, 248, 0.2)' : '#e0f2fe') : (isDark ? '#27272a' : '#f1f5f9'),
                              color: isQiskit ? (isDark ? '#38bdf8' : '#0284c7') : (isDark ? '#a1a1aa' : '#64748b')
                            }}
                            className="p-2 rounded-lg shrink-0 transition-colors"
                          >
                            <Cpu className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium" style={{ color: colors.textPrimary }}>
                                Gate Circuit (Qiskit)
                              </span>
                              <span 
                                style={{
                                  backgroundColor: isDark ? 'rgba(56, 189, 248, 0.15)' : 'rgba(2, 132, 199, 0.1)',
                                  color: isDark ? '#38bdf8' : '#0284c7',
                                  borderColor: isDark ? 'rgba(56, 189, 248, 0.3)' : 'rgba(2, 132, 199, 0.3)'
                                }}
                                className="text-[10px] font-mono px-1.5 py-0.5 rounded border"
                              >
                                aer_simulator
                              </span>
                            </div>
                            <p className="text-[11px] truncate mt-0.5" style={{ color: colors.textMuted }}>
                              Wires, timesteps & interactive gate canvas
                            </p>
                          </div>
                        </div>

                        {/* Radio Indicator */}
                        <div 
                          style={{
                            borderColor: isQiskit ? (isDark ? '#38bdf8' : '#0284c7') : (isDark ? '#52525b' : '#cbd5e1'),
                            backgroundColor: isQiskit ? (isDark ? '#38bdf8' : '#0284c7') : 'transparent'
                          }}
                          className="w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-all"
                        >
                          {isQiskit && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Row B: D-Wave Annealer / QUBO */}
                  {(() => {
                    const isDwave = selectedTemplateKey === 'dwave-annealing' || selectedTemplateKey === 'portfolio-optimization';
                    return (
                      <div
                        onClick={() => setSelectedTemplateKey('dwave-annealing')}
                        style={{
                          backgroundColor: isDwave ? (isDark ? '#0c2233' : '#f0f9ff') : (isDark ? '#16161B' : '#ffffff'),
                          borderColor: isDwave ? (isDark ? '#38bdf8' : '#0284c7') : (isDark ? '#27272a' : '#e2e8f0'),
                        }}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 group ${
                          isDwave ? 'shadow-xs' : 'hover:opacity-90'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div 
                            style={{
                              backgroundColor: isDwave ? (isDark ? 'rgba(56, 189, 248, 0.2)' : '#e0f2fe') : (isDark ? '#27272a' : '#f1f5f9'),
                              color: isDwave ? (isDark ? '#38bdf8' : '#0284c7') : (isDark ? '#a1a1aa' : '#64748b')
                            }}
                            className="p-2 rounded-lg shrink-0 transition-colors"
                          >
                            <Activity className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium" style={{ color: colors.textPrimary }}>
                                Quantum Annealing (D-Wave)
                              </span>
                              <span 
                                style={{
                                  backgroundColor: isDark ? 'rgba(56, 189, 248, 0.15)' : 'rgba(2, 132, 199, 0.1)',
                                  color: isDark ? '#38bdf8' : '#0284c7',
                                  borderColor: isDark ? 'rgba(56, 189, 248, 0.3)' : 'rgba(2, 132, 199, 0.3)'
                                }}
                                className="text-[10px] font-mono px-1.5 py-0.5 rounded border"
                              >
                                dwave_annealer
                              </span>
                            </div>
                            <p className="text-[11px] truncate mt-0.5" style={{ color: colors.textMuted }}>
                              Binary Quadratic Models (BQM) & energy minimization
                            </p>
                          </div>
                        </div>

                        {/* Radio Indicator */}
                        <div 
                          style={{
                            borderColor: isDwave ? (isDark ? '#38bdf8' : '#0284c7') : (isDark ? '#52525b' : '#cbd5e1'),
                            backgroundColor: isDwave ? (isDark ? '#38bdf8' : '#0284c7') : 'transparent'
                          }}
                          className="w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-all"
                        >
                          {isDwave && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Row C: Enterprise Quantum Service (Phase 5 Forward-Compatible) */}
                  {(() => {
                    const isEnterprise = selectedTemplateKey === 'enterprise-service';
                    return (
                      <div
                        onClick={() => setSelectedTemplateKey('enterprise-service')}
                        style={{
                          backgroundColor: isEnterprise ? (isDark ? '#0c2233' : '#f0f9ff') : (isDark ? '#16161B' : '#ffffff'),
                          borderColor: isEnterprise ? (isDark ? '#38bdf8' : '#0284c7') : (isDark ? '#27272a' : '#e2e8f0'),
                        }}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 group ${
                          isEnterprise ? 'shadow-xs' : 'hover:opacity-90'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            style={{
                              backgroundColor: isEnterprise ? (isDark ? 'rgba(56, 189, 248, 0.2)' : '#e0f2fe') : (isDark ? '#27272a' : '#f1f5f9'),
                              color: isEnterprise ? (isDark ? '#38bdf8' : '#0284c7') : (isDark ? '#a1a1aa' : '#64748b')
                            }}
                            className="p-2 rounded-lg shrink-0 transition-colors"
                          >
                            <Layers className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium" style={{ color: colors.textPrimary }}>
                                Enterprise Quantum Service
                              </span>
                              <span
                                style={{
                                  backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)',
                                  color: isDark ? '#34d399' : '#059669',
                                  borderColor: isDark ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.3)'
                                }}
                                className="text-[10px] font-mono px-1.5 py-0.5 rounded border font-semibold"
                              >
                                phase_5_ready
                              </span>
                            </div>
                            <p className="text-[11px] truncate mt-0.5" style={{ color: colors.textMuted }}>
                              Modular Ingress, Algorithm, Classical Baseline & Egress architecture
                            </p>
                          </div>
                        </div>

                        {/* Radio Indicator */}
                        <div
                          style={{
                            borderColor: isEnterprise ? (isDark ? '#38bdf8' : '#0284c7') : (isDark ? '#52525b' : '#cbd5e1'),
                            backgroundColor: isEnterprise ? (isDark ? '#38bdf8' : '#0284c7') : 'transparent'
                          }}
                          className="w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-all"
                        >
                          {isEnterprise && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* 3. Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t" style={{ borderColor: isDark ? '#222226' : '#f1f5f9' }}>
                <button
                  onClick={() => setIsNewProjectOpen(false)}
                  style={{ 
                    color: colors.textMuted, 
                    backgroundColor: isDark ? '#1a1a22' : '#f1f5f9',
                    borderColor: isDark ? '#2e2e36' : '#e2e8f0'
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-medium border hover:opacity-80 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateCustomProject}
                  style={{ 
                    backgroundColor: isDark ? '#38bdf8' : '#0284c7', 
                    color: isDark ? '#02121f' : '#ffffff' 
                  }}
                  className="px-4.5 py-2 rounded-xl text-xs font-bold shadow-md hover:opacity-90 transition-all cursor-pointer flex items-center gap-1.5 active:scale-98"
                >
                  <Plus className="w-4 h-4" style={{ color: isDark ? '#02121f' : '#ffffff' }} />
                  <span>Create Project</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
