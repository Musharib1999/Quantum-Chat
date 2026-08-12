"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  Truck, Users, Briefcase, Factory, 
  Plus, History, 
  Send, ChevronRight, Circle, Activity, Info,
  CheckCircle, AlertCircle, Loader2, Bot, User, Terminal,
  X, Settings, Database, Cpu, Trash2, Paperclip
} from 'lucide-react';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import { useQuantumChat } from '@/hooks/useQuantumChat';
import { 
  getChatSessions, 
  deleteChatSession, 
  createChatSession, 
  updateChatSession 
} from '@/app/actions/chat';

interface MathComponentProps {
  math: string;
  displayMode?: boolean;
}

function MathComponent({ math, displayMode = false }: MathComponentProps) {
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    const win = window as any;
    if (win.katex) {
      try {
        const rendered = win.katex.renderToString(math, {
          displayMode,
          throwOnError: false
        });
        setHtml(rendered);
      } catch (err) {
        console.error("KaTeX rendering error:", err);
      }
    }
  }, [math, displayMode]);

  if (html) {
    return <span dangerouslySetInnerHTML={{ __html: html }} className="inline-block max-w-full overflow-x-auto" />;
  }

  return <span>{displayMode ? `$$ ${math} $$` : `$ ${math} $`}</span>;
}

interface ChatSession {
  id: string;
  title: string;
  messages: any[];
  workflowSteps?: {
    nlp?: any;
    reasoner?: any;
    suggestor?: any;
    solver?: any;
    verifier?: any;
    dcc?: boolean;
    suggested_solver?: string;
    classifier?: string;
    latex_model?: string;
    optimization_stats?: any;
    solver_routing?: any;
    qa_report?: any;
    compiler_metrics?: any;
    [key: string]: any;
  };
}

export default function App() {
  const getPipelineTitle = (pipeline: string) => {
    switch (pipeline) {
      case 'optimization': return 'Optimization Studio';
      case 'algorithm': return 'Quantum Algorithm Studio';
      case 'coder': return 'Quantum Circuit Studio';
      case 'general':
      default:
        return 'Quantum Assistant';
    }
  };

  const getPipelineTagline = (pipeline: string) => {
    switch (pipeline) {
      case 'optimization':
        return (
          <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <span>Business Problem</span>
            <ChevronRight className="w-3 h-3 text-slate-300" />
            <span>Deterministic Compilation</span>
            <ChevronRight className="w-3 h-3 text-slate-300" />
            <span>Optimal Execution</span>
          </div>
        );
      case 'algorithm':
        return (
          <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <span>Algorithm Specification</span>
            <ChevronRight className="w-3 h-3 text-slate-300" />
            <span>Quantum Program</span>
            <ChevronRight className="w-3 h-3 text-slate-300" />
            <span>Execution</span>
          </div>
        );
      case 'coder':
        return (
          <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <span>Quantum Intent</span>
            <ChevronRight className="w-3 h-3 text-slate-300" />
            <span>Deterministic Circuit</span>
            <ChevronRight className="w-3 h-3 text-slate-300" />
            <span>Simulation</span>
          </div>
        );
      case 'general':
      default:
        return (
          <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <span>Question</span>
            <ChevronRight className="w-3 h-3 text-slate-300" />
            <span>Verified Knowledge</span>
            <ChevronRight className="w-3 h-3 text-slate-300" />
            <span>Explanation</span>
          </div>
        );
    }
  };
  const [selectedStrategy, setSelectedStrategy] = useState<'Auto' | 'CQM' | 'QUBO' | 'OR-Tools'>('Auto');
  const [selectedPipeline, setSelectedPipeline] = useState<'general' | 'optimization' | 'algorithm' | 'coder'>('optimization');
  
  const {
    messages,
    setMessages,
    inputValue,
    setInputValue,
    isTyping,
    sendMessage,
    messagesEndRef,
    scrollContainerRef,
    handleScroll,
    setShouldAutoScroll
  } = useQuantumChat('assistant', { mode: selectedStrategy.toLowerCase(), selectedPipeline });

  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [expandObjective, setExpandObjective] = useState(false);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [selectedPenalty, setSelectedPenalty] = useState<number | 'custom'>(3);
  const [customPenalty, setCustomPenalty] = useState<string>('30');
  const [isExecuting, setIsExecuting] = useState(false);
  const attachMenuRef = useRef<HTMLDivElement>(null);
  const historyDrawerRef = useRef<HTMLDivElement>(null);

  // Sessions list loaded dynamically from MongoDB
  const [sessions, setSessions] = useState<ChatSession[]>([]);

  const activeSession = sessions.find(s => s.id === activeSessionId);

  // Load chat sessions from MongoDB on mount
  useEffect(() => {
    async function loadSessions() {
      try {
        const dbSessions = await getChatSessions();
        if (dbSessions && dbSessions.length > 0) {
          const mapped = dbSessions.map((s: any) => ({
            id: s._id || s.id,
            title: s.title || 'Untitled Session',
            messages: s.messages || [],
            workflowSteps: s.workflowSteps || undefined
          }));
          setSessions(mapped);
        } else {
          setSessions([]);
        }
      } catch (err) {
        console.error("Failed to load chat sessions from MongoDB:", err);
      }
    }
    loadSessions();
  }, []);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (attachMenuRef.current && !attachMenuRef.current.contains(event.target as Node)) {
        setShowAttachMenu(false);
      }
      if (historyDrawerRef.current && !historyDrawerRef.current.contains(event.target as Node)) {
        const target = event.target as HTMLElement;
        // Don't close if clicking the history button in the sidebar
        if (!target.closest('.history-toggle-btn')) {
          setShowHistoryDrawer(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectSession = (id: string) => {
    setActiveSessionId(id);
    const session = sessions.find(s => s.id === id);
    if (session) {
      setMessages(session.messages);
    }
    setShowHistoryDrawer(false);
  };

  const startNewChat = () => {
    setActiveSessionId(null);
    setMessages([]);
    setInputValue("");
    setShowHistoryDrawer(false);
  };

  const handleDeleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const isRealMongoId = id.match(/^[0-9a-fA-F]{24}$/);
    try {
      if (isRealMongoId) {
        await deleteChatSession(id);
      }
      setSessions(prev => prev.filter(s => s.id !== id));
      if (activeSessionId === id) {
        startNewChat();
      }
    } catch (err) {
      console.error("Failed to delete chat session:", err);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputValue;
    if (!text.trim()) return;
    setIsCreatingSession(true);
    setInputValue("");

    let targetSessionId = activeSessionId;
    
    // Create new session in MongoDB if none is active
    if (!targetSessionId) {
      const shortTitle = text.length > 25 ? text.substring(0, 22) + '...' : text;
      try {
        const newDbSession = await createChatSession(shortTitle, [], {});
        targetSessionId = newDbSession._id || newDbSession.id;
        
        const newSession: ChatSession = {
          id: targetSessionId as string,
          title: shortTitle,
          messages: [],
          workflowSteps: undefined
        };
        setSessions(prev => [newSession, ...prev]);
        setActiveSessionId(targetSessionId);
      } catch (err) {
        console.error("Failed to create chat session in DB:", err);
        targetSessionId = 'session-' + Date.now(); // local fallback
        const newSession: ChatSession = {
          id: targetSessionId as string,
          title: shortTitle,
          messages: [],
          workflowSteps: undefined
        };
        setSessions(prev => [newSession, ...prev]);
        setActiveSessionId(targetSessionId);
      }
    }

    // Call sendMessage from hook
    await sendMessage(text, { 
      sessionId: targetSessionId,
      mode: selectedStrategy.toLowerCase(),
      selectedPipeline,
      selectedPenalty,
      customPenalty,
      isDirect: false, // Must use LLM parser for natural language on first submit
      runSolver: false,
    });
    setIsCreatingSession(false);
  };

  // Sync back messages to current session
  useEffect(() => {
    // Skip database updates during active solver execution to avoid Server Action concurrency bottlenecks
    if (isExecuting) return;

    if (activeSessionId && messages.length > 0) {
      const lastBotMsg = [...messages].reverse().find(m => m.sender === 'bot');
      const workflowSteps = lastBotMsg?.workflowSteps || undefined;

      // Extract original compile steps to merge execution progress without losing metadata
      const compileBotMsg = [...messages].reverse().find(m => m.sender === 'bot' && m.workflowSteps?.nlp);
      const compileSteps = compileBotMsg?.workflowSteps || {};
      const mergedSteps = {
        ...compileSteps,
        ...(workflowSteps || {})
      };

      setSessions(prev => prev.map(s => {
        if (s.id === activeSessionId) {
          return {
            ...s,
            messages: messages,
            workflowSteps: mergedSteps
          };
        }
        return s;
      }));

      // Persist updates to MongoDB
      const isRealMongoId = activeSessionId.match(/^[0-9a-fA-F]{24}$/);
      if (isRealMongoId) {
        updateChatSession(activeSessionId, messages, mergedSteps).catch(err => {
          console.error("Failed to sync chat session updates to DB:", err);
        });
      }
    }
  }, [messages, activeSessionId, isExecuting]);

  const actionCards = [
    {
      title: 'Logistics & Routing',
      description: 'Fleet Routing • Warehouse • Delivery',
      icon: <Truck className="w-6 h-6 text-blue-600" />,
      color: 'bg-blue-50 border-blue-100',
      example: 'Optimize delivery routes for 8 trucks across 12 warehouses minimizing fuel cost.'
    },
    {
      title: 'Workforce Scheduling',
      description: 'Staff Rosters • Shift Planning • Nurses',
      icon: <Users className="w-6 h-6 text-purple-600" />,
      color: 'bg-purple-50 border-purple-100',
      example: 'Schedule 8 nurses across 3 wards over 7 days. Nurse 0 and 5 cannot work the same shift.'
    },
    {
      title: 'Portfolio & Finance',
      description: 'Investment • Budget • Risk',
      icon: <Briefcase className="w-6 h-6 text-emerald-600" />,
      color: 'bg-emerald-50 border-emerald-100',
      example: 'Allocate budget across 5 assets maximizing returns with soft penalty bounds.'
    },
    {
      title: 'Supply Chain',
      description: 'Supplier Selection • Inventory',
      icon: <Factory className="w-6 h-6 text-orange-600" />,
      color: 'bg-orange-50 border-orange-100',
      example: 'Select suppliers for 10 factory components to minimize cost while keeping capacity bounds.'
    }
  ];

  const sidebarSteps = [
    { name: 'Understanding Problem', key: 'nlp' },
    { name: 'Mathematical Modeling', key: 'nlp' },
    { name: 'Constraint Verification', key: 'reasoner' },
    { name: 'Solver Selection', key: 'suggestor' },
    { name: 'Code Generation', key: 'solver' },
    { name: 'Execution & Results', key: 'verifier' },
    { name: 'Interpretation', key: 'interpretation' }
  ];

  // Helper to parse workspace metadata from activeSession.workflowSteps
  const getWorkflowDetails = () => {
    if (!activeSession || !activeSession.workflowSteps) return null;
    const steps = activeSession.workflowSteps;
    const mathRigor = steps.math_rigor;
    
    // 1. Problem classification
    const classification = steps.classifier || "Selection Optimization";

    // Build agent logs status checks
    const hasNlp = !!steps.nlp;
    const hasReasoner = !!steps.reasoner;
    const hasSuggestor = !!steps.suggestor;
    const hasSolver = !!steps.solver;
    const hasVerifier = !!steps.verifier;

    const agentLogs = [
      { agent: "SupervisorAgent", action: "Initialized shared workspace (memory bounds set)", status: hasNlp ? "Success" : "Pending" },
      { agent: "UnderstandingAgent", action: "Wrote variables & constraints to problem spec registry", status: hasNlp ? "Success" : "Pending" },
      { agent: "ModelingAgent", action: "Constructed normalized OptimizationIR mathematical formulations", status: hasNlp ? "Success" : "Pending" },
      { agent: "ConstraintVerificationAgent", action: "Checked numerical feasibility & logic constraints", status: hasReasoner ? "Success" : "Pending" },
      { agent: "SolverStrategyAgent", action: "Determined optimal solver path & hardware registry compatibility", status: hasSuggestor ? "Success" : "Pending" },
      { agent: "CodeGenerationAgent", action: "Wrote executable Python solver model implementation", status: hasSolver ? "Success" : "Pending" },
      { agent: "ExecutionAgent", action: "Evaluated solver output values & optimization metrics", status: hasVerifier ? "Success" : "Pending" },
      { agent: "RepairAgent", action: "Verified solution bounds & applied AST syntax repair rules", status: hasVerifier ? "Success" : "Pending" }
    ];

    if (mathRigor && Object.keys(mathRigor).length > 0) {
      const objectiveLatex = mathRigor.objective_latex;
      const objectiveExpanded = mathRigor.objective_expanded;
      const objectiveIsLarge = mathRigor.objective_is_large;
      
      const variablesList = mathRigor.variables || [];
      const parametersList = mathRigor.parameters || [];
      const constraintsList = mathRigor.constraints || [];
      const constraintCounts = mathRigor.constraint_counts || {};
      const solverRecommendation = mathRigor.solver_recommendation || {};
      const quadraticTerms = mathRigor.quadratic_terms || [];
      const hasQuadratic = mathRigor.has_quadratic || false;
      
      const varsDomainsLatex = variablesList.map((v: any) => {
        return `${v.latex_def} \\quad \\text{where } ${v.index_set}`;
      }).join("\n\n");
      
      const constraintsLatex = constraintsList.map((c: any) => c.latex).join("\n\n");
      const modelLatex = objectiveLatex ? `${objectiveLatex}\n\n$$\\text{subject to:}$$\n\n${constraintsLatex}` : constraintsLatex;
      
      let totalVarCount = variablesList.length;

      return {
        classification,
        objectives: mathRigor.objectives || [],
        variables: variablesList,
        parameters: parametersList,
        constraints: constraintsList,
        totalVarCount,
        feasibilityText: steps.reasoner || "Feasibility check passed",
        qaAudit: steps.verifier || "Verification: Code passed QA audit",
        dccActive: steps.dcc || false,
        modelDetails: {
          solver: steps.suggested_solver || "D-Wave / OR-Tools Solver",
          suggestor: steps.suggestor || "Decision: Auto-routed solver path",
        },
        objectiveLatex,
        objectiveExpanded,
        objectiveIsLarge,
        modelLatex,
        varsDomainsLatex,
        agentLogs,
        constraintCounts,
        solverRecommendation,
        quadraticTerms,
        hasQuadratic
      };
    }

    // Legacy Fallback if math_rigor is missing (e.g. historical sessions)
    let parsedSpecs: any = null;
    if (steps.nlp) {
      try {
        const cleanedNlp = steps.nlp.trim();
        if (cleanedNlp.startsWith('{') || cleanedNlp.startsWith('[')) {
          parsedSpecs = JSON.parse(cleanedNlp);
        }
      } catch (e) {
        console.error("Failed to parse nlp JSON in sidebar:", e);
      }
    }
    
    let objectivesList: any[] = [];
    let objectiveLatex = "";
    if (parsedSpecs && Array.isArray(parsedSpecs.objectives)) {
      objectivesList = parsedSpecs.objectives;
    } else if (parsedSpecs && parsedSpecs.objective) {
      objectivesList = [parsedSpecs.objective];
    }
    if (objectivesList.length > 0) {
      const obj = objectivesList[0];
      if (obj.formula) {
        objectiveLatex = obj.formula.replace(/^\$\$/, "").replace(/\$\$/, "").trim();
      } else {
        const sense = obj.sense === "maximize" ? "\\text{Maximize}" : "\\text{Minimize}";
        if (obj.expression && Array.isArray(obj.expression.coefficients)) {
          // If expression is long, render summation
          if (obj.expression.coefficients.length > 5) {
            objectiveLatex = `${sense} \\quad \\sum_{i=0}^{${obj.expression.coefficients.length - 1}} c_{i} \\cdot ${obj.expression.var_id || 'x'}_{i}`;
          } else {
            const terms = obj.expression.coefficients.map((c: number, idx: number) => {
              const varName = obj.expression.var_id || "x";
              return `${c} \\cdot ${varName}_{${idx}}`;
            }).join(" + ");
            objectiveLatex = `${sense} \\quad ${terms}`;
          }
        } else {
          objectiveLatex = `${sense} \\quad \\text{Objective Function}`;
        }
      }
    }
    
    const variablesList = (parsedSpecs && Array.isArray(parsedSpecs.variable_registry)) ? parsedSpecs.variable_registry : [];
    const constraintsList = (parsedSpecs && Array.isArray(parsedSpecs.constraint_registry)) ? parsedSpecs.constraint_registry : [];

    let totalVarCount = 0;
    variablesList.forEach((v: any) => {
      if (v.dimensions && Array.isArray(v.dimensions)) {
        const prod = v.dimensions.reduce((acc: number, d: number) => acc * d, 1);
        totalVarCount += prod;
      } else {
        totalVarCount += 1;
      }
    });

    const feasibilityText = steps.reasoner || "Feasibility check passed";
    const qaAudit = steps.verifier || "Verification: Code passed QA audit";
    const dccActive = steps.dcc || false;

    const modelDetails = {
      solver: steps.solver || "D-Wave / OR-Tools Solver",
      suggestor: steps.suggestor || "Decision: Auto-routed solver path",
    };

    const constraintsLatex = constraintsList.map((c: any) => {
      if (c.formula) {
        return `$$ ${c.formula} \\quad \\text{(${c.name || c.id})} $$`;
      } else {
        const opMap: any = {"<=": "\\le", ">=": "\\ge", "==": "="};
        const op = opMap[c.operator] || c.operator;
        let lhsStr = c.lhs?.var_id || "x";
        if (c.lhs?.coefficients && Array.isArray(c.lhs.coefficients)) {
          if (c.lhs.coefficients.length > 5) {
            lhsStr = `\\sum_{i=0}^{${c.lhs.coefficients.length - 1}} a_{i} \\cdot ${c.lhs.var_id || 'x'}_{i}`;
          } else {
            lhsStr = c.lhs.coefficients.map((coeff: number, idx: number) => `${coeff} \\cdot ${c.lhs.var_id}_{${idx}}`).join(" + ");
          }
        }
        let rhsStr = c.rhs?.value !== undefined ? String(c.rhs.value) : c.rhs?.var_id || "0";
        return `$$ ${lhsStr} ${op} ${rhsStr} \\quad \\text{(${c.name || c.id})} $$`;
      }
    }).join("\n\n");

    const modelLatex = objectiveLatex ? `${objectiveLatex}\n\n$$\\text{subject to:}$$\n\n${constraintsLatex}` : constraintsLatex;

    const varsDomainsLatex = variablesList.map((v: any) => {
      const domainSet = v.domain === "boolean" ? "\\{0, 1\\}" : v.domain === "integer" ? "\\mathbb{Z}" : "\\mathbb{R}";
      const dimStr = v.dimensions && Array.isArray(v.dimensions) && v.dimensions.length > 0 ? `^{${v.dimensions.join(" \\times ")}}` : "";
      return `$$ ${v.id} \\in ${domainSet}${dimStr} $$`;
    }).join("\n\n");

    return {
      classification,
      objectives: objectivesList,
      variables: variablesList,
      parameters: [],
      constraints: constraintsList,
      totalVarCount,
      feasibilityText,
      qaAudit,
      dccActive,
      modelDetails,
      objectiveLatex,
      modelLatex,
      varsDomainsLatex,
      agentLogs,
      constraintCounts: null,
      solverRecommendation: null
    };
  };

  const templates = [
    'Vehicle Routing', 'Nurse Scheduling', 'Knapsack QUBO', 
    'Bin Packing', 'Portfolio Optimization', 'Timetabling'
  ];

  const getStepStatus = (stepIdx: number) => {
    if (isTyping && messages.length > 0 && messages[messages.length - 1].sender === 'user') {
      return 'loading';
    }
    if (!activeSession || !activeSession.workflowSteps) {
      return 'pending';
    }
    const steps = activeSession.workflowSteps;
    switch (stepIdx) {
      case 0:
      case 1:
        return steps.nlp ? 'completed' : 'pending';
      case 2:
        return steps.reasoner ? 'completed' : 'pending';
      case 3:
        return steps.suggestor ? 'completed' : 'pending';
      case 4:
        return steps.solver ? 'completed' : 'pending';
      case 5:
        return steps.verifier ? 'completed' : 'pending';
      case 6:
        return !isTyping ? 'completed' : 'pending';
      default:
        return 'pending';
    }
  };

  const getStepContent = (stepIdx: number) => {
    if (!activeSession || !activeSession.workflowSteps) return null;
    const steps = activeSession.workflowSteps;
    switch (stepIdx) {
      case 0:
      case 1:
        return steps.nlp;
      case 2:
        return steps.reasoner;
      case 3:
        return steps.suggestor;
      case 4:
        return `Target solver: ${steps.solver}`;
      case 5:
        return steps.verifier;
      case 6:
        return "Explanation parsed and rendered successfully.";
      default:
        return null;
    }
  };

  // Load MathJax dynamically and re-typeset on state changes with debouncing and stream-proofing
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const win = window as any;
    const typeset = () => {
      if (win.MathJax?.typesetPromise) {
        win.MathJax.typesetPromise().catch(() => {});
      }
    };

    // Check if any message in the chat is currently streaming
    const isAnyStreaming = messages.some((m: any) => m.isStreaming);
    if (isAnyStreaming) {
      return; // Skip typesetting during active streams to prevent concurrent rendering browser crashes
    }

    if (!win.MathJax) {
      win.MathJax = {
        tex: { inlineMath: [['$','$']], displayMath: [['$$','$$']] },
        options: { skipHtmlTags: ['script','noscript','style','textarea','pre','code'] },
        startup: { ready() { win.MathJax.startup.defaultReady(); typeset(); } }
      };
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js';
      s.async = true;
      document.head.appendChild(s);
    } else {
      // Debounce typesetting to prevent concurrent calls and let DOM fully settle
      const timer = setTimeout(typeset, 250);
      return () => clearTimeout(timer);
    }
  }, [activeSessionId, messages, isTyping]);

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-800 font-sans relative overflow-hidden">
      
      {/* Left Sidebar (Narrow: Icon-Only Layout) */}
      <div className="w-16 bg-white border-r border-slate-200 flex flex-col items-center py-4 justify-between z-30 shrink-0 h-screen shadow-sm overflow-visible">
        
        {/* Upper Icons */}
        <div className="flex flex-col gap-4 items-center w-full">
          <div className="w-10 h-10 mb-4 cursor-pointer relative flex items-center justify-center active:scale-95 transition-transform group" onClick={startNewChat}>
            <img src="/qg-icon.png" alt="Quantum Guru" className="w-9 h-9 object-contain rounded-lg shadow-sm" />
            <span className="absolute left-14 top-1/2 -translate-y-1/2 bg-slate-800 text-white text-[10px] font-semibold px-2.5 py-1 rounded-lg opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-all duration-150 z-[9999] shadow-lg">Quantum Guru</span>
          </div>
          
          {/* New Chat Button */}
          <button 
            onClick={startNewChat}
            className="w-10 h-10 flex items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-all tooltip-trigger relative group active:scale-95 cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            <span className="absolute left-14 top-1/2 -translate-y-1/2 bg-slate-800 text-white text-[10px] font-semibold px-2.5 py-1 rounded-lg opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-all duration-150 z-[9999] shadow-lg">New chat</span>
          </button>
          
          {/* Recent Problems/Conversations Toggle Button */}
          <button 
            onClick={() => setShowHistoryDrawer(!showHistoryDrawer)}
            className={`history-toggle-btn w-10 h-10 flex items-center justify-center rounded-xl transition-all group relative active:scale-95 cursor-pointer border ${
              showHistoryDrawer 
                ? 'bg-blue-50 text-blue-600 border-blue-100 shadow-inner' 
                : 'border-transparent text-slate-500 hover:bg-slate-50 hover:text-blue-600'
            }`}
          >
            <History className="w-5 h-5" />
            <span className="absolute left-14 top-1/2 -translate-y-1/2 bg-slate-800 text-white text-[10px] font-semibold px-2.5 py-1 rounded-lg opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-all duration-150 z-[9999] shadow-lg">Recent problems</span>
          </button>
        </div>

        {/* Lower Icons */}
        <div className="flex flex-col gap-4 items-center w-full">
          {/* Help & Info Toggle */}
          <button className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-50 hover:text-blue-600 transition-all group relative active:scale-95 cursor-pointer">
            <Info className="w-5 h-5" />
            <span className="absolute left-14 top-1/2 -translate-y-1/2 bg-slate-800 text-white text-[10px] font-semibold px-2.5 py-1 rounded-lg opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-all duration-150 z-[9999] shadow-lg">Help & docs</span>
          </button>

          {/* Profile Avatar MS (Opens Profile Modal) */}
          <div 
            onClick={() => setIsProfileOpen(true)}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold text-white shadow-sm active:scale-95 cursor-pointer relative group transition-opacity hover:opacity-90" style={{ backgroundColor: '#444444' }}
          >
            MS
            <span className="absolute left-14 top-1/2 -translate-y-1/2 bg-slate-800 text-white text-[10px] font-semibold px-2.5 py-1 rounded-lg opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-all duration-150 z-[9999] shadow-lg">User account</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative overflow-hidden bg-[#f8fafc]">
        {/* Slide-over Drawer for Recent Conversations */}
        {showHistoryDrawer && (
          <div 
            ref={historyDrawerRef}
            className="absolute left-0 top-0 bottom-0 w-64 bg-white border-r border-slate-200 shadow-2xl z-20 flex flex-col p-4 animate-in slide-in-from-left duration-200"
          >
            <div className="flex items-center justify-between mb-4 px-1 shrink-0">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Recent Problems</h3>
              <button 
                onClick={() => setShowHistoryDrawer(false)}
                className="text-slate-400 hover:text-slate-650 p-1 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
              {sessions.map(s => (
                <div
                  key={s.id}
                  onClick={() => selectSession(s.id)}
                  className={`group w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all cursor-pointer ${
                    s.id === activeSessionId 
                      ? 'bg-blue-600/10 border border-blue-500/20 text-blue-600 font-semibold' 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <span className="truncate flex-1 pr-2">{s.title}</span>
                  <button 
                    onClick={(e) => handleDeleteSession(s.id, e)}
                    className="opacity-0 group-hover:opacity-100 hover:text-red-500 p-0.5 rounded transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {sessions.length === 0 && (
                <p className="text-[11px] text-slate-400 text-center py-8 italic">No previous problems.</p>
              )}
            </div>
          </div>
        )}
        {/* Top Nav */}
        <header className="h-14 border-b border-slate-200 bg-white/85 backdrop-blur flex items-center px-6 justify-between shrink-0 z-10">
          <div className="flex items-center gap-3">
            {selectedStrategy !== 'Auto' && (
              <span className="text-[10px] font-bold px-2 py-0.5 bg-purple-50 text-purple-600 border border-purple-200 rounded-md">
                Forcing: {selectedStrategy}
              </span>
            )}
          </div>
          <div />
        </header>

        {/* Scrollable Dashboard or Message Flow */}
        <div 
          ref={scrollContainerRef as any}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto pb-6"
        >
          {messages.length === 0 ? (
            /* Dashboard View */
            <div className="max-w-5xl mx-auto px-8 pt-12 flex flex-col gap-12 animate-in fade-in duration-300">
              
              {/* Hero Section */}
              <div className="text-center max-w-3xl mx-auto space-y-4">
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight leading-none">
                  What optimization problem would you like to solve?
                </h1>
                <p className="text-slate-500 text-md max-w-2xl mx-auto leading-relaxed">
                  Describe your business challenge in natural language. The Council of Experts will analyze it, formulate a mathematical model, recommend the optimal solver, and execute it.
                </p>
              </div>

              {/* Action Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {actionCards.map((card, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => setInputValue(card.example)}
                    className="bg-white border border-slate-200 rounded-xl p-5 cursor-pointer hover:border-blue-500 hover:shadow-md transition-all group flex flex-col gap-3 active:scale-98 shadow-sm"
                  >
                    <div className={`w-12 h-12 rounded-lg ${card.color} flex items-center justify-center group-hover:scale-105 transition-transform`}>
                      {card.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 mb-1 text-sm">{card.title}</h3>
                      <p className="text-[11px] text-slate-500 leading-relaxed">{card.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Popular Templates */}
              <div className="space-y-4">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Popular Templates</h3>
                <div className="flex flex-wrap gap-2">
                  {templates.map((template, idx) => (
                    <button 
                      key={idx}
                      onClick={() => {
                        let q = "";
                        if (template.includes("Routing")) q = "Optimize delivery routes for 8 trucks across 12 warehouses minimizing fuel cost.";
                        else if (template.includes("Scheduling")) q = "Schedule 8 nurses across 3 wards over 7 days. Nurse 0 and 5 cannot work the same shift.";
                        else if (template.includes("QUBO")) q = "Create a soft-constrained portfolio optimization model for 5 assets.";
                        else q = `Formulate a standard ${template.toLowerCase()} optimization problem.`;
                        setInputValue(q);
                      }}
                      className="px-4 py-2 rounded-full border border-slate-200 bg-white text-xs font-medium text-slate-600 hover:border-blue-300 hover:bg-blue-50 transition-colors active:scale-95 shadow-sm"
                    >
                      {template}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          ) : (
            /* Chat Flow View */
            <div className="max-w-4xl mx-auto px-8 pt-8 space-y-6">
              {messages.map(msg => (
                <div 
                  key={msg.id} 
                  className={`flex w-full min-w-0 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-3 duration-300`}
                >
                  <div className={`flex min-w-0 max-w-[85%] gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'} items-start`}>
                    
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm border ${msg.sender === 'user' ? 'bg-slate-100 border-slate-200 text-slate-600' : 'bg-white border-slate-200 p-0 overflow-hidden'}`}>
                      {msg.sender === 'user' 
                        ? <User className="w-4 h-4" /> 
                        : <img src="/qg-icon.png" alt="Quantum Guru" className="w-8 h-8 object-cover rounded-lg" />}
                    </div>

                    <div
                      className={`min-w-0 rounded-2xl px-5 py-3.5 shadow-sm text-sm leading-relaxed overflow-hidden ${msg.sender === 'user' ? 'text-white rounded-tr-sm' : 'bg-white border border-slate-200 text-slate-700 rounded-tl-sm'}`}
                      style={msg.sender === 'user' ? { backgroundColor: '#2E65BF' } : {}}
                    >
                      {msg.sender === 'user' ? (
                        <div className="whitespace-pre-wrap break-words">{msg.text}</div>
                      ) : (
                        <div className="prose prose-slate max-w-none text-slate-700 overflow-hidden break-words">
                          <MarkdownRenderer content={msg.text} suggestedSolver={msg.workflowSteps?.suggested_solver} hideRunButton={selectedPipeline === 'optimization'} />
                          {/* Execute Button: shown for optimization pipeline once QUBO code is ready and not yet executed */}
                          {selectedPipeline === 'optimization' && msg.workflowSteps?.quboCodeStatus === 'done' && !msg.workflowSteps?.outputStatus?.includes('done') && !msg.isStreaming && (
                            <div className="mt-4 pt-4 border-t border-slate-200">
                              <button
                                onClick={async () => {
                                  if (isExecuting) return;
                                  setIsExecuting(true);
                                  
                                  const execMsgId = Date.now() + 500;
                                  
                                  // Update parent status AND append the new execution bubble
                                  setMessages(prev => [
                                    ...prev.map(m => {
                                      if (m.id === msg.id) {
                                        return {
                                          ...m,
                                          workflowSteps: m.workflowSteps ? {
                                            ...m.workflowSteps,
                                            simulatorStatus: 'running',
                                            outputStatus: 'pending'
                                          } : undefined
                                        };
                                      }
                                      return m;
                                    }),
                                    {
                                      id: execMsgId,
                                      sender: 'bot' as const,
                                      text: "⏳ **Running Solver...**\nRunning D-Wave Simulated Annealing (5,000 reads)...",
                                      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                                      workflowSteps: {
                                        outputStatus: 'running',
                                        simulatorStatus: 'running'
                                      }
                                    }
                                  ]);

                                  // Force scroll to bottom via standard scrollContainer logic
                                  setShouldAutoScroll(true);
                                  
                                  try {
                                    const res = await fetch('/api/direct-model/stream', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({
                                        model_text: msg.workflowSteps?.nlp || '',
                                        penalty_choice: selectedPenalty === 'custom' ? parseInt(customPenalty || '30') : selectedPenalty,
                                        num_reads: 5000,
                                        run_solver: true,
                                        session_id: activeSessionId
                                      })
                                    });

                                    if (!res.ok) {
                                      throw new Error(`Execution failed: ${res.statusText}`);
                                    }

                                    const reader = res.body?.getReader();
                                    const decoder = new TextDecoder();
                                    let accumulated = "";

                                    let simStatus = 'running';
                                    let outStatus = 'pending';
                                    let solverOutputText = "";

                                    if (reader) {
                                      while (true) {
                                        const { done, value } = await reader.read();
                                        if (done) break;

                                        accumulated += decoder.decode(value, { stream: true });
                                        const lines = accumulated.split('\n');
                                        accumulated = lines.pop() || "";

                                        for (const line of lines) {
                                          if (line.trim().startsWith('data:')) {
                                            try {
                                              const update = JSON.parse(line.slice(5));
                                              const step = update.step;

                                              if (step === 'simulator') {
                                                if (update.status === 'running') {
                                                  simStatus = 'running';
                                                } else if (update.status === 'done') {
                                                  simStatus = 'done';
                                                }
                                              } else if (step === 'output') {
                                                if (update.status === 'done') {
                                                  outStatus = 'done';
                                                  solverOutputText = update.output_text || "";
                                                }
                                              }

                                              // Update parent status AND update new execution bubble
                                              setMessages(prev => prev.map(m => {
                                                if (m.id === msg.id) {
                                                  return {
                                                    ...m,
                                                    workflowSteps: m.workflowSteps ? {
                                                      ...m.workflowSteps,
                                                      simulatorStatus: simStatus,
                                                      outputStatus: outStatus
                                                      // solver_output is omitted to avoid duplicate history cards
                                                    } : undefined
                                                  };
                                                }
                                                if (m.id === execMsgId) {
                                                  let textToShow = "⏳ **Running Solver...**\nRunning D-Wave Simulated Annealing (5,000 reads)...";
                                                  if (solverOutputText) {
                                                    textToShow = solverOutputText;
                                                  } else if (simStatus === 'done') {
                                                    textToShow = "✅ **Solver Complete**\nPreparing optimization output...";
                                                  }
                                                  return {
                                                    ...m,
                                                    text: textToShow,
                                                    workflowSteps: {
                                                      outputStatus: outStatus,
                                                      simulatorStatus: simStatus,
                                                      solver_output: solverOutputText
                                                    }
                                                  };
                                                }
                                                return m;
                                              }));
                                            } catch (_) {}
                                          }
                                        }
                                      }
                                    }
                                  } catch (err: any) {
                                    console.error("Solver execution error:", err);
                                    setMessages(prev => prev.map(m => {
                                      if (m.id === execMsgId) {
                                        return {
                                          ...m,
                                          text: `❌ **Execution Error**: ${err.message}`,
                                          workflowSteps: {
                                            outputStatus: 'error'
                                          }
                                        };
                                      }
                                      return m;
                                    }));
                                  } finally {
                                    setIsExecuting(false);
                                  }
                                }}
                                disabled={isExecuting}
                                className="flex items-center gap-2.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-xl transition-all shadow-sm cursor-pointer"
                              >
                                {isExecuting ? (
                                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Running Solver...</>
                                ) : (
                                  <><Terminal className="w-3.5 h-3.5" /> Execute Solver</>
                                )}
                              </button>
                              <p className="mt-2 text-[10px] text-slate-400">Runs D-Wave Simulated Annealing · 5,000 reads</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex w-full justify-start animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex flex-row items-center gap-4">
                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
                      <img src="/qg-icon.png" alt="Quantum Guru" className="w-8 h-8 object-cover rounded-lg" />
                    </div>
                    <div className="flex space-x-1 pl-4 py-3 bg-white border border-slate-200 rounded-2xl shadow-sm px-4">
                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area (Fixed Bottom, standard flow) */}
        <div className="bg-[#f8fafc] pt-2 pb-6 px-8 shrink-0 z-10 border-t border-slate-200/50">
          <div className="max-w-4xl mx-auto flex flex-col gap-3">
                        {getPipelineTagline(selectedPipeline)}

            <div className="bg-white border border-slate-300 rounded-2xl shadow-md focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10 transition-all flex flex-col">
              <textarea 
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={
                  selectedPipeline === 'optimization'
                    ? "Describe your optimization problem... Example: optimize delivery routes, nurse scheduling..."
                    : selectedPipeline === 'algorithm'
                    ? "Specify the quantum algorithm you want to design..."
                    : selectedPipeline === 'coder'
                    ? "Describe the quantum circuit you want to compile and simulate..."
                    : "Ask a quantum computing question..."
                }
                className="w-full p-4 text-slate-707 placeholder:text-slate-400 outline-none resize-none bg-transparent text-sm leading-relaxed min-h-[90px]"
                rows={3}
                disabled={isTyping}
              />
              
              {/* Bottom Row Actions Panel */}
              <div className="flex items-center justify-between px-4 pb-3 pt-2 border-t border-slate-100 bg-slate-50/50">
                
                {/* Left side actions */}
                <div className="flex items-center gap-2">
                  {/* "+" Attachment/Option Button */}
                  <div className="relative" ref={attachMenuRef}>
                    <button 
                      onClick={() => setShowAttachMenu(!showAttachMenu)}
                      className={`w-9 h-9 rounded-xl border border-slate-200 text-slate-500 hover:text-blue-600 hover:bg-slate-50 flex items-center justify-center transition-all cursor-pointer active:scale-95 ${showAttachMenu ? 'bg-blue-50 text-blue-600 border-blue-100 shadow-sm' : ''}`}
                    >
                      <Plus className="w-4 h-4" />
                    </button>

                    {/* Attachment Context Dropdown Menu — fixed position to escape overflow-hidden parents */}
                    {showAttachMenu && attachMenuRef.current && (() => {
                      const rect = (attachMenuRef.current as HTMLElement).getBoundingClientRect();
                      return (
                        <div
                          style={{
                            position: 'fixed',
                            bottom: `${window.innerHeight - rect.top + 8}px`,
                            left: `${rect.left}px`,
                          }}
                          className="w-64 bg-white border border-slate-200 rounded-xl shadow-2xl p-2 z-[9999] flex flex-col gap-1.5 animate-in slide-in-from-bottom-2 duration-150"
                        >
                          <div className="text-[11px] font-semibold text-slate-400 px-2.5 pb-2 pt-1 border-b border-slate-100 mb-1">
                            Select mode
                          </div>

                          {[
                            { label: 'Quantum Assistant', pipeline: 'general' },
                            { label: 'Optimization Studio', pipeline: 'optimization' },
                            { label: 'Quantum Algorithm Studio', pipeline: 'algorithm' },
                            { label: 'Quantum Circuit Studio', pipeline: 'coder' },
                          ].map(({ label, pipeline }) => (
                            <button
                              key={label}
                              onClick={() => { 
                                setSelectedPipeline(pipeline as any);
                                setShowAttachMenu(false); 
                              }}
                              className="w-full text-left px-3 py-2.5 hover:bg-blue-50 hover:text-blue-700 rounded-lg text-[11px] font-medium text-slate-700 flex items-center gap-2.5 cursor-pointer transition-colors group"
                            >
                              <span className="leading-snug">{label}</span>
                            </button>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Submit Button */}
                <button 
                  onClick={() => handleSendMessage()}
                  disabled={!inputValue.trim() || isTyping || isCreatingSession}
                  className={`h-9 px-4 rounded-xl flex items-center justify-center gap-1.5 font-semibold text-xs transition-all cursor-pointer shadow-sm active:scale-95 ${
                    inputValue.trim().length > 0 && !isTyping 
                      ? 'bg-blue-600 hover:bg-blue-700 active:bg-blue-850 text-white' 
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                  }`}
                >
                  {isTyping ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Thinking...</span>
                    </>
                  ) : (
                    <>
                      <span>Submit</span>
                      <Send className="w-3 h-3 ml-0.5" />
                    </>
                  )}
                </button>

              </div>
            </div>
            
            {/* Pipeline Connection Status */}
            <div className="flex items-center justify-center gap-1.5 mt-1 opacity-80">
                <span className="text-[10px] font-medium text-slate-500">
                    Connected to: <span className="font-bold text-slate-600">{getPipelineTitle(selectedPipeline)}</span>
                </span>
            </div>
          </div>
        </div>
      </div>      {/* Right Sidebar (Workflow Insights) */}
      <div className="w-80 bg-white border-l border-slate-200 flex flex-col z-10 hidden lg:flex shrink-0">
        <div className="h-14 border-b border-slate-200 flex items-center px-6 shrink-0 justify-between">
          <div className="flex items-center">
            <Activity className="w-4 h-4 text-blue-600 mr-2" />
            <h2 className="font-semibold text-slate-800 text-sm">
              {getPipelineTitle(selectedPipeline)}
            </h2>
          </div>
        </div>
        
        <div className="p-4 flex-1 overflow-y-auto space-y-3">
          {/* Waiting/Initial Header Status Card */}
          {(!activeSession || !activeSession.workflowSteps || (!activeSession.workflowSteps.nlp && !activeSession.workflowSteps.math_rigor)) && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex flex-col items-center justify-center text-center gap-2 animate-in fade-in duration-250">
              <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-400 animate-pulse">
                <Activity className="w-4 h-4" />
              </div>
              <p className="text-xs font-semibold text-slate-500">Waiting for problem submission...</p>
              <p className="text-[10px] text-slate-400 max-w-[200px] leading-relaxed">Pipeline traces will display here once execution starts.</p>
            </div>
          )}

          {/* ── OPTIMIZATION STUDIO SIDEBAR ───────────────────────────── */}
          {selectedPipeline === 'optimization' && activeSession && activeSession.workflowSteps && (activeSession.workflowSteps.nlp || activeSession.workflowSteps.math_rigor) && (() => {
            const ws = activeSession.workflowSteps;
            const details = getWorkflowDetails();
            const optStats = ws.optimization_stats || {};
            const qMatrixDone = ws.qMatrixStatus === 'done';
            const quboCodeDone = ws.quboCodeStatus === 'done';
            const outputDone = ws.outputStatus === 'done';
            const penaltyLabels: Record<number | string, string> = {
              1: 'Penalty 1',
              2: 'Penalty 2',
              3: 'Penalty 3',
              4: 'Penalty 4',
              5: 'Penalty 5',
              6: 'Penalty 6',
              custom: 'Custom λ',
            };

            // Resolve penalty weights on client side
            const getPenaltyValue = (choice: 1 | 2 | 3 | 4 | 5 | 6) => {
              if (!details) return null;
              const objCoeffs = details.objectives?.[0]?.expression?.coefficients || [];
              const absObjCoeffs = objCoeffs.length > 0 ? objCoeffs.map(Math.abs) : [1.0];
              const maxC = Math.max(...absObjCoeffs);
              const sumC = absObjCoeffs.reduce((a, b) => a + b, 0);
              const nConstraints = details.constraints?.length || 1;

              if (choice === 1) return Number((sumC + 1.0).toFixed(2));
              if (choice === 2) return Number((maxC * nConstraints + 1.0).toFixed(2));
              if (choice === 3) return Number((maxC + 1.0).toFixed(2));
              if (choice === 4) {
                const sumSq = absObjCoeffs.reduce((a, b) => a + b * b, 0);
                return Number((Math.sqrt(sumSq) + 1.0).toFixed(2));
              }
              if (choice === 5) {
                let maxRatio = 0;
                (details.constraints || []).forEach((c: any) => {
                  const coeffs = c.lhs?.coefficients || [];
                  coeffs.forEach((cVal: number, i: number) => {
                    if (Math.abs(cVal) > 1e-9 && objCoeffs[i] !== undefined) {
                      const ratio = Math.abs(objCoeffs[i]) / Math.abs(cVal);
                      if (ratio > maxRatio) maxRatio = ratio;
                    }
                  });
                });
                return maxRatio > 0 ? Number((maxRatio + 1.0).toFixed(2)) : Number((maxC + 1.0).toFixed(2));
              }
              if (choice === 6) {
                let k = null;
                (details.constraints || []).forEach((c: any) => {
                  if (['=', '==', '<='].includes(c.operator)) {
                    const coeffs = c.lhs?.coefficients || [];
                    if (coeffs.length > 0 && coeffs.every((val: number) => Math.abs(val - 1.0) < 1e-9)) {
                      const valRight = typeof c.rhs?.value === 'number' ? c.rhs.value : Number(c.rhs?.value || 0);
                      if (k === null || valRight < k) {
                        k = valRight;
                      }
                    }
                  }
                });
                if (k === null) {
                  k = Math.max(1, Math.ceil((details.variables?.length || 1) * 0.35));
                }
                const sortedCoeffs = [...absObjCoeffs].sort((a, b) => b - a);
                const densitySum = sortedCoeffs.slice(0, k).reduce((a, b) => a + b, 0);
                return Number((densitySum + 1.0).toFixed(2));
              }
              return null;
            };

            return (
              <div className="space-y-3">

                {/* Card: Q Matrix */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 hover:shadow-sm transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-blue-600">Q Matrix</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${qMatrixDone ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-amber-50 text-amber-600 border border-amber-200'}`}>
                      {ws.qMatrixStatus === 'running' ? '⏳ Building...' : qMatrixDone ? '✓ Done' : '○ Pending'}
                    </span>
                  </div>
                  {qMatrixDone && optStats.q_size ? (
                    <div className="space-y-1 text-[11px]">
                      <div className="flex justify-between bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg">
                        <span className="text-slate-500">Dimension</span>
                        <span className="font-semibold text-slate-700">{optStats.q_size} × {optStats.q_size}</span>
                      </div>
                      <div className="flex justify-between bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg">
                        <span className="text-slate-500">Non-zero entries</span>
                        <span className="font-semibold text-slate-700">{optStats.q_nnz}</span>
                      </div>
                      <div className="flex justify-between bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg">
                        <span className="text-slate-500">Decision vars</span>
                        <span className="font-semibold text-slate-700">{optStats.decision_vars_count}</span>
                      </div>
                      <div className="flex justify-between bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg">
                        <span className="text-slate-500">Slack vars</span>
                        <span className="font-semibold text-slate-700">{optStats.slack_vars_count}</span>
                      </div>
                      <div className="flex justify-between bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg">
                        <span className="text-slate-500">Matrix density</span>
                        <span className="font-semibold text-slate-700">{optStats.matrix_density}%</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-400 italic">Submit a problem to build Q matrix</p>
                  )}
                </div>

                {/* Card: QUBO Code */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 hover:shadow-sm transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-blue-600">QUBO Code</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${quboCodeDone ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-slate-100 text-slate-400 border border-slate-200'}`}>
                      {quboCodeDone ? '✓ Generated' : '○ Pending'}
                    </span>
                  </div>
                  {quboCodeDone ? (
                    <div className="text-[10px] text-slate-500 bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg">
                      Python script compiled from QUBO formulation. Visible in chat below.
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-400 italic">Generated after Q matrix is compiled</p>
                  )}
                </div>

                {/* Card: Penalty Selector */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5 hover:shadow-sm transition-all">
                  <span className="text-[11px] font-semibold text-blue-600 block">Penalty λ</span>
                  <div className="space-y-1.5">
                    {([1, 2, 3, 4, 5, 6] as const).map((p) => {
                      const val = getPenaltyValue(p);
                      return (
                        <button
                          key={p}
                          onClick={() => setSelectedPenalty(p)}
                          className={`w-full text-left text-[10px] px-2.5 py-1.5 rounded-lg border font-medium transition-all cursor-pointer ${selectedPenalty === p ? 'bg-white text-blue-600 border-blue-600 shadow-sm ring-1 ring-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600'}`}
                        >
                          {penaltyLabels[p]}{val !== null ? ` (λ = ${val})` : ''}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => setSelectedPenalty('custom')}
                      className={`w-full text-left text-[10px] px-2.5 py-1.5 rounded-lg border font-medium transition-all cursor-pointer ${selectedPenalty === 'custom' ? 'bg-white text-blue-600 border-blue-600 shadow-sm ring-1 ring-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600'}`}
                    >
                      Custom λ{selectedPenalty === 'custom' && optStats.penalty_weight !== undefined && !optStats.penalty_label ? ` (λ = ${optStats.penalty_weight})` : ''}
                    </button>
                    {selectedPenalty === 'custom' && (
                      <input
                        type="number"
                        value={customPenalty}
                        onChange={(e) => setCustomPenalty(e.target.value)}
                        placeholder="e.g. 30"
                        className="w-full text-[10px] px-2.5 py-1.5 rounded-lg border border-blue-300 bg-white text-slate-700 outline-none focus:ring-1 focus:ring-blue-400"
                      />
                    )}
                  </div>
                  {/* Rerun button */}
                  {quboCodeDone && (
                    <button
                      onClick={async () => {
                        if (isExecuting) return;
                        setIsExecuting(true);
                        const compileBotMsg = [...messages].reverse().find((m: any) => m.sender === 'bot' && m.workflowSteps?.nlp);
                        const spec = compileBotMsg?.workflowSteps?.nlp || '';
                        await sendMessage(spec || '__rerun__', {
                          selectedPipeline: 'optimization',
                          selectedPenalty,
                          customPenalty,
                          isDirect: true,
                          runSolver: false,
                          mode: selectedStrategy.toLowerCase(),
                        });
                        setIsExecuting(false);
                      }}
                      disabled={isExecuting}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-[10px] font-semibold rounded-lg transition-all cursor-pointer shadow-sm"
                    >
                      {isExecuting ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> Running...</> : "Rerun"}
                    </button>
                  )}
                </div>

                {/* Card: Output */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 hover:shadow-sm transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-blue-600">Solver Output</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${outputDone ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-slate-100 text-slate-400 border border-slate-200'}`}>
                      {ws.outputStatus === 'running' ? '⏳ Running...' : outputDone ? '✓ Done' : '○ Pending'}
                    </span>
                  </div>
                  {outputDone && ws.solver_output ? (
                    <div className="max-h-[200px] overflow-y-auto">
                      <MarkdownRenderer content={ws.solver_output} isSidebar={true} />
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-400 italic">Click Execute Solver in chat to run</p>
                  )}
                </div>

              </div>
            );
          })()}

          {/* ── COUNCIL OF EXPERTS (Optimization) 11 cards ── */}
          {activeSession && activeSession.workflowSteps && (activeSession.workflowSteps.nlp || activeSession.workflowSteps.math_rigor) && (() => {
            const details = getWorkflowDetails();
            if (!details) return null;
            
            return (
              <div className="space-y-3">

                {/* Card 1: Problem classification */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 hover:shadow-sm transition-all animate-in fade-in duration-200">
                  <span className="text-[11px] font-semibold text-blue-600">
                    1. Problem classification
                  </span>
                  <div className="text-[11px] text-slate-700 font-medium leading-snug">
                    {details.classification}
                  </div>
                </div>

                {/* Card 2: Objective */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 hover:shadow-sm transition-all animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-blue-600">
                      2. Objective
                    </span>
                  </div>
                  {details.objectiveLatex ? (
                    <div className="font-mono text-[11px] text-slate-700 bg-white border border-slate-200 p-2.5 rounded-lg leading-relaxed overflow-x-auto flex justify-center">
                      <MathComponent math={details.objectiveLatex} displayMode={true} />
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-400 italic">
                      Direct single-scalar objective goal
                    </div>
                  )}
                </div>
                {/* Card 3: Variables */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 hover:shadow-sm transition-all animate-in fade-in duration-200">
                  <span className="text-[11px] font-semibold text-blue-600">
                    3. Variable primitives
                  </span>
                  <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                    {details.variables.length > 0 ? (
                      details.variables.map((v: any, vidx: number) => (
                        <div key={vidx} className="bg-white border border-slate-200 p-2 rounded-lg">
                          <div className="text-[11px] text-slate-700 font-medium">
                            <span className="font-semibold text-slate-800">{v.id}</span>: {v.name}
                          </div>
                          {v.latex_def ? (
                            <div className="mt-1 space-y-0.5">
                              <div className="font-mono text-[10px] text-slate-500 bg-slate-50 px-1 py-0.5 rounded border border-slate-100 flex items-center gap-1 overflow-x-auto">
                                <MarkdownRenderer content={v.latex_def} isSidebar={true} />
                              </div>
                              {v.index_set && (
                                <div className="text-[10px] text-slate-400 font-mono">
                                  for {v.index_set}
                                </div>
                              )}
                              <div className="text-[10px] text-slate-500 italic">
                                {v.mapping_text}
                              </div>
                            </div>
                          ) : (
                            <div className="mt-1 font-mono text-[11px] text-slate-400">
                              Domain: {v.domain} · [{v.dimensions?.join(' × ')}]
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-[11px] text-slate-400 italic">
                        No variables registered
                      </div>
                    )}
                  </div>
                </div>
                {/* Card 4: Constraints summary */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 hover:shadow-sm transition-all animate-in fade-in duration-200">
                  <span className="text-[11px] font-semibold text-blue-600">
                    4. Constraints summary
                  </span>
                  <div className="text-[11px] text-slate-700 font-medium">
                    Total registered: <span className="text-blue-600 font-semibold">{details.constraints.length}</span>
                  </div>
                  {details.constraintCounts ? (
                    <div className="space-y-1 mt-1 text-[11px] text-slate-500 bg-white border border-slate-200 p-2 rounded-lg">
                      {Object.entries(details.constraintCounts).map(([family, count]: any) => (
                        <div key={family} className="flex justify-between border-b border-slate-100 last:border-b-0 py-0.5">
                          <span className="text-slate-500">{family}</span>
                          <span className="font-semibold text-slate-700">{count}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-500 leading-normal">
                      Families: {details.constraints.map((c: any) => c.family).filter((v: any, i: number, self: any[]) => self.indexOf(v) === i).join(', ') || 'None'}
                    </div>
                  )}
                </div>
                {/* Card 5: Mathematical model */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 hover:shadow-sm transition-all animate-in fade-in duration-200">
                  <span className="text-[11px] font-semibold text-blue-600">
                    5. Mathematical model
                  </span>
                  <div className="font-mono text-[11px] text-slate-700 bg-white border border-slate-200 p-2.5 rounded-lg leading-relaxed max-h-[240px] overflow-y-auto space-y-2.5">
                    {details.objectiveLatex ? (
                      <div className="flex justify-center border-b border-slate-100 pb-2 mb-2">
                        <MathComponent math={details.objectiveLatex} displayMode={true} />
                      </div>
                    ) : (
                      <span className="italic text-slate-400 text-[10px]">No objective registered.</span>
                    )}
                    <div className="text-[9px] text-slate-400 uppercase tracking-wider mb-1">Subject to:</div>
                    {details.constraints && details.constraints.length > 0 ? (
                      details.constraints.map((c: any, cidx: number) => {
                        const formula = c.formula || (() => {
                          const opMap: any = {"<=": "\\le", ">=": "\\ge", "==": "="};
                          const op = opMap[c.operator] || c.operator;
                          let lhsStr = c.lhs?.var_id || "x";
                          if (c.lhs?.coefficients && Array.isArray(c.lhs.coefficients)) {
                            if (c.lhs.coefficients.length > 5) {
                              lhsStr = `\\sum_{i=0}^{${c.lhs.coefficients.length - 1}} a_{i} \\cdot ${c.lhs.var_id || 'x'}_{i}`;
                            } else {
                              lhsStr = c.lhs.coefficients.map((coeff: number, idx: number) => `${coeff} \\cdot ${c.lhs.var_id}_{${idx}}`).join(" + ");
                            }
                          }
                          let rhsStr = c.rhs?.value !== undefined ? String(c.rhs.value) : c.rhs?.var_id || "0";
                          return `${lhsStr} ${op} ${rhsStr}`;
                        })();
                        return (
                          <div key={cidx} className="flex items-center justify-between py-1 border-b border-slate-50 last:border-b-0">
                            <MathComponent math={formula} displayMode={false} />
                            <span className="text-[9px] text-slate-400 font-mono">({c.name || c.id})</span>
                          </div>
                        );
                      })
                    ) : (
                      <span className="italic text-slate-400 text-[10px]">No constraints registered.</span>
                    )}
                  </div>
                </div>

                {/* Card 6: Solver recommendation */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 hover:shadow-sm transition-all animate-in fade-in duration-200">
                  <span className="text-[11px] font-semibold text-blue-600">
                    6. Solver recommendation
                  </span>
                  <div className="space-y-1.5">
                    <div className="text-[11px] text-blue-600 font-semibold">
                      {details.modelDetails.solver}
                    </div>
                    <div className="text-[11px] text-slate-500 leading-normal bg-white border border-slate-200 p-2 rounded-lg">
                      {details.modelDetails.suggestor}
                    </div>
                  </div>
                </div>
                {/* Card 7: Constraint details */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 hover:shadow-sm transition-all animate-in fade-in duration-200">
                  <span className="text-[11px] font-semibold text-blue-600">
                    7. Constraint details
                  </span>
                  <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
                    {details.constraints.length > 0 ? (
                      details.constraints.map((c: any, cidx: number) => (
                        <div key={cidx} className="bg-white border border-slate-200 p-2.5 rounded-lg space-y-1">
                          <div className="text-[11px] text-slate-700 font-medium">
                            <span className="font-semibold text-slate-800">{c.name}</span>: {c.description}
                          </div>
                          <div className="font-mono text-[11px] text-slate-400">
                            Family: {c.family} · Op: {c.operator}
                          </div>
                          {c.formula && (
                            <div className="font-mono text-[11px] text-slate-600 pt-1 border-t border-slate-100 overflow-x-auto flex justify-center">
                              <MathComponent math={c.formula} displayMode={true} />
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-[11px] text-slate-400 italic">
                        No constraints registered
                      </div>
                    )}
                  </div>
                </div>

                {/* Card 8: Feasibility */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 hover:shadow-sm transition-all animate-in fade-in duration-200">
                  <span className="text-[11px] font-semibold text-blue-600">
                    8. Feasibility
                  </span>
                  <div className="font-mono text-[11px] text-slate-600 bg-white border border-slate-200 p-2.5 rounded-lg leading-relaxed max-h-[140px] overflow-y-auto">
                    {details.feasibilityText}
                  </div>
                </div>

                {/* Card 9: Variable count */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 hover:shadow-sm transition-all animate-in fade-in duration-200">
                  <span className="text-[11px] font-semibold text-blue-600">
                    9. Parameters
                  </span>
                  <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                    {details.parameters && details.parameters.length > 0 ? (
                      details.parameters.map((p: any, pidx: number) => (
                        <div key={pidx} className="bg-white border border-slate-200 p-2 rounded-lg">
                          <div className="text-[11px] font-medium text-slate-700">
                            {p.name}
                          </div>
                          <div className="mt-0.5 font-mono text-[10px] text-slate-400 break-all bg-slate-50 p-1 rounded border border-slate-100 overflow-x-auto">
                            {p.value}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-[11px] text-slate-400 italic">
                        No external parameters parsed
                      </div>
                    )}
                  </div>
                </div>
                {/* Card 10: QA audit */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 hover:shadow-sm transition-all animate-in fade-in duration-200">
                  <span className="text-[11px] font-semibold text-blue-600">
                    10. QA audit
                  </span>
                  <div className="text-[11px] text-slate-600 leading-relaxed bg-white border border-slate-200 p-2.5 rounded-lg space-y-1">
                    <div><span className="font-semibold text-slate-700">Audit:</span> {details.qaAudit}</div>
                    <div><span className="font-semibold text-slate-700">DCC status:</span> {details.dccActive ? "Active — deterministic compiler applied" : "Inactive — passes standard check"}</div>
                  </div>
                </div>

                {/* Card 11: Output Run History */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 hover:shadow-sm transition-all animate-in fade-in duration-200">
                  <span className="text-[11px] font-semibold text-blue-600">
                    11. Execution Output History
                  </span>
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {(() => {
                      const runOutputs = messages.filter(m => m.sender === 'bot' && m.workflowSteps?.solver_output);
                      if (runOutputs.length > 0) {
                        return runOutputs.map((run, idx) => (
                          <div key={run.id || idx} className="bg-white border border-slate-200 p-2.5 rounded-lg space-y-1.5">
                            <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono border-b border-slate-100 pb-1">
                              <span>Run #{idx + 1}</span>
                              <span>{run.timestamp || new Date().toLocaleTimeString()}</span>
                            </div>
                            <div className="text-[10px] text-slate-700 leading-relaxed font-sans max-h-[100px] overflow-y-auto">
                              <MarkdownRenderer content={run.workflowSteps?.solver_output || ""} isSidebar={true} />
                            </div>
                          </div>
                        ));
                      }
                      return (
                        <div className="text-[11px] text-slate-400 italic">
                          No execution output recorded yet
                        </div>
                      );
                    })()}
                  </div>
                </div>

              </div>
            );
          })()}
        </div>
      </div>
      {/* User Profile Modal Overlay */}
      {isProfileOpen && (
        <div className="fixed inset-0 bg-slate-955/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200 flex flex-col">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-150">
              <h3 className="font-extrabold text-sm text-slate-800 tracking-tight flex items-center gap-2">
                <Settings className="w-4.5 h-4.5 text-blue-600" />
                User Account Profile
              </h3>
              <button 
                onClick={() => setIsProfileOpen(false)}
                className="text-slate-400 hover:text-slate-605 p-1.5 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              
              {/* Profile Card Info */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold text-white shadow-md" style={{ backgroundColor: '#444444' }}>
                  MS
                </div>
                <div>
                  <h4 className="font-extrabold text-md text-slate-800 leading-snug">Musharib Subhani</h4>
                  <p className="text-xs text-slate-500">Principal Quantum Optimization Engineer</p>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200 mt-1.5">
                    Authorized Administrator
                  </span>
                </div>
              </div>

              {/* Account Details list */}
              <div className="space-y-3 bg-slate-50 border border-slate-200 rounded-xl p-4">
                <div className="flex items-center justify-between text-xs border-b border-slate-200/60 pb-2">
                  <span className="text-slate-500 font-medium">Email address:</span>
                  <span className="text-slate-800 font-semibold">ms@qc.guru</span>
                </div>
                <div className="flex items-center justify-between text-xs border-b border-slate-200/60 pb-2">
                  <span className="text-slate-500 font-medium">Session Token Usage:</span>
                  <span className="text-slate-800 font-semibold">12,483 / 50,000 (Soft Limit)</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Workspace Status:</span>
                  <span className="text-slate-800 font-semibold flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span> Active
                  </span>
                </div>
              </div>

              {/* Connected Infrastructure Traces */}
              <div className="space-y-2.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                  Infrastructure Traces
                </span>
                
                <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-semibold text-slate-700">MongoDB Instance</span>
                  </div>
                  <span className="text-[10px] font-bold bg-green-50 border border-green-200 text-green-600 px-2 py-0.5 rounded-full uppercase">
                    Connected
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-semibold text-slate-700">FastAPI Agent Engine</span>
                  </div>
                  <span className="text-[10px] font-bold bg-green-50 border border-green-200 text-green-600 px-2 py-0.5 rounded-full uppercase">
                    Connected
                  </span>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-150 bg-slate-50 flex justify-end">
              <button 
                onClick={() => setIsProfileOpen(false)}
                className="bg-slate-800 hover:bg-slate-900 active:bg-slate-955 text-white px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-sm"
              >
                Close Profile
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
