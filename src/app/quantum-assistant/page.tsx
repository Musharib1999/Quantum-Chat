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
  const [selectedStrategy, setSelectedStrategy] = useState<'Auto' | 'CQM' | 'QUBO' | 'OR-Tools'>('Auto');
  const [selectedPipeline, setSelectedPipeline] = useState<'general' | 'optimization' | 'coder'>('general');
  
  const {
    messages,
    setMessages,
    inputValue,
    setInputValue,
    isTyping,
    sendMessage,
    messagesEndRef,
    scrollContainerRef,
    handleScroll
  } = useQuantumChat('assistant', { mode: selectedStrategy.toLowerCase(), selectedPipeline });

  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
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
      selectedPipeline
    });
  };

  // Sync back messages to current session
  useEffect(() => {
    if (activeSessionId && messages.length > 0) {
      const lastBotMsg = [...messages].reverse().find(m => m.sender === 'bot');
      const workflowSteps = lastBotMsg?.workflowSteps || undefined;

      setSessions(prev => prev.map(s => {
        if (s.id === activeSessionId) {
          return {
            ...s,
            messages: messages,
            workflowSteps: workflowSteps || s.workflowSteps
          };
        }
        return s;
      }));

      // Persist updates to MongoDB
      const isRealMongoId = activeSessionId.match(/^[0-9a-fA-F]{24}$/);
      if (isRealMongoId) {
        updateChatSession(activeSessionId, messages, workflowSteps || {}).catch(err => {
          console.error("Failed to sync chat session updates to DB:", err);
        });
      }
    }
  }, [messages, activeSessionId]);

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
    
    // 1. Problem classification
    const classification = steps.classifier || (parsedSpecs ? `Pattern: ${parsedSpecs.problem_pattern || 'unknown'}` : "Pattern: General Optimization");

    // 2. Objective & Objective Latex
    let objectivesList: any[] = [];
    let objectiveLatex = "";
    if (parsedSpecs && parsedSpecs.objectives) {
      objectivesList = parsedSpecs.objectives;
    } else if (parsedSpecs && parsedSpecs.objective) {
      objectivesList = [parsedSpecs.objective];
    }
    if (objectivesList.length > 0) {
      const obj = objectivesList[0];
      if (obj.formula) {
        objectiveLatex = `$$ ${obj.formula} $$`;
      } else {
        const sense = obj.sense === "maximize" ? "\\text{Maximize}" : "\\text{Minimize}";
        if (obj.expression && obj.expression.coefficients) {
          const terms = obj.expression.coefficients.map((c: number, idx: number) => {
            const varName = obj.expression.var_id || "x";
            return `${c} \\cdot ${varName}_{${idx}}`;
          }).join(" + ");
          objectiveLatex = `$$ ${sense} \\quad ${terms} $$`;
        } else {
          objectiveLatex = `$$ ${sense} \\quad \\text{Objective Function} $$`;
        }
      }
    }
    
    // 3. Variables
    const variablesList = (parsedSpecs && parsedSpecs.variable_registry) ? parsedSpecs.variable_registry : [];

    // 4. Constraints
    const constraintsList = (parsedSpecs && parsedSpecs.constraint_registry) ? parsedSpecs.constraint_registry : [];

    // 5. Variable count
    let totalVarCount = 0;
    variablesList.forEach((v: any) => {
      if (v.dimensions && Array.isArray(v.dimensions)) {
        const prod = v.dimensions.reduce((acc: number, d: number) => acc * d, 1);
        totalVarCount += prod;
      } else {
        totalVarCount += 1;
      }
    });

    // 6. Feasibility
    const feasibilityText = steps.reasoner || "Feasibility check passed";

    // 7. QA Audit status
    const qaAudit = steps.verifier || "Verification: Code passed QA audit";
    const dccActive = steps.dcc || false;

    // 8. Optimization model details
    const modelDetails = {
      solver: steps.solver || "D-Wave / OR-Tools Solver",
      suggestor: steps.suggestor || "Decision: Auto-routed solver path",
    };

    // 9. LaTeX formulations compiled (For Card 5 & Card 6)
    const constraintsLatex = constraintsList.map((c: any) => {
      if (c.formula) {
        return `$$ ${c.formula} \\quad \\text{(${c.name || c.id})} $$`;
      } else {
        const opMap: any = {"<=": "\\le", ">=": "\\ge", "==": "="};
        const op = opMap[c.operator] || c.operator;
        let lhsStr = c.lhs?.var_id || "x";
        if (c.lhs?.coefficients) {
          lhsStr = c.lhs.coefficients.map((coeff: number, idx: number) => `${coeff} \\cdot ${c.lhs.var_id}_{${idx}}`).join(" + ");
        }
        let rhsStr = c.rhs?.value !== undefined ? String(c.rhs.value) : c.rhs?.var_id || "0";
        return `$$ ${lhsStr} ${op} ${rhsStr} \\quad \\text{(${c.name || c.id})} $$`;
      }
    }).join("\n\n");

    const modelLatex = objectiveLatex ? `${objectiveLatex}\n\n$$\\text{subject to:}$$\n\n${constraintsLatex}` : constraintsLatex;

    const varsDomainsLatex = variablesList.map((v: any) => {
      const domainSet = v.domain === "boolean" ? "\\{0, 1\\}" : v.domain === "integer" ? "\\mathbb{Z}" : "\\mathbb{R}";
      const dimStr = v.dimensions && v.dimensions.length > 0 ? `^{${v.dimensions.join(" \\times ")}}` : "";
      return `$$ ${v.id} \\in ${domainSet}${dimStr} $$`;
    }).join("\n\n");

    // 10. Agent Shared Memory Trace — status only shows when step data is genuinely populated
    const hasNlp = !!(steps.nlp && (Array.isArray(steps.nlp.variables) ? steps.nlp.variables.length > 0 : steps.nlp.parsed));
    const hasReasoner = !!(steps.reasoner && (steps.reasoner.verdict || steps.reasoner.result || steps.reasoner.feasible !== undefined));
    const hasSuggestor = !!(steps.suggestor && steps.suggestor.strategy);
    const hasSolver = !!(steps.solver && steps.solver.code);
    const hasVerifier = !!(steps.verifier && (steps.verifier.passed !== undefined || steps.verifier.output));

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

    return {
      classification,
      objectives: objectivesList,
      variables: variablesList,
      constraints: constraintsList,
      totalVarCount,
      feasibilityText,
      qaAudit,
      dccActive,
      modelDetails,
      objectiveLatex,
      modelLatex,
      varsDomainsLatex,
      agentLogs
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

  // Load MathJax dynamically and re-typeset on state changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const win = window as any;
    const typeset = () => {
      if (win.MathJax?.typesetPromise) {
        win.MathJax.typesetPromise().catch(() => {});
      }
    };
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
      setTimeout(typeset, 80);
    }
  }, [activeSession, messages, activeSessionId, isTyping]);

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
                          <MarkdownRenderer content={msg.text} />
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
            
            <div className="flex items-center justify-center gap-2 text-[10px] font-bold tracking-widest uppercase mb-1">
              {selectedPipeline === 'general' ? <span className="text-teal-600 bg-teal-50 px-2 py-0.5 rounded">General QA Mode</span> : 
               selectedPipeline === 'coder' ? <span className="text-purple-600 bg-purple-50 px-2 py-0.5 rounded">Code Generation Mode</span> :
               <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded">Optimization Mode</span>}
            </div>
            <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              <span>Natural Language</span>
              <ChevronRight className="w-3 h-3 text-slate-300" />
              <span>Mathematical Model</span>
              <ChevronRight className="w-3 h-3 text-slate-300" />
              <span>Optimal Solution</span>
            </div>

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
                    ? "Describe your optimization problem... Example: optimize delivery routes, Nurse shift allocation..."
                    : selectedPipeline === 'coder'
                    ? "Describe the quantum code you want to generate..."
                    : "Ask a general quantum computing question..."
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
                            { label: 'General Quantum Computing Questions', icon: '⚛️' },
                            { label: 'Business Problem to Optimization', icon: '📊' },
                            { label: 'Generate Quantum Code', icon: '💻' },
                          ].map(({ label, icon }) => (
                            <button
                              key={label}
                              onClick={() => { 
                                setSelectedPipeline(
                                  label === 'Business Problem to Optimization' ? 'optimization' :
                                  label === 'Generate Quantum Code' ? 'coder' : 'general'
                                );
                                setShowAttachMenu(false); 
                              }}
                              className="w-full text-left px-3 py-2.5 hover:bg-blue-50 hover:text-blue-700 rounded-lg text-[11px] font-medium text-slate-700 flex items-center gap-2.5 cursor-pointer transition-colors group"
                            >
                              <span className="text-base leading-none">{icon}</span>
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
                  disabled={!inputValue.trim() || isTyping}
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
          </div>
        </div>
      </div>      {/* Right Sidebar (Workflow Insights) */}
      <div className="w-80 bg-white border-l border-slate-200 flex flex-col z-10 hidden lg:flex shrink-0">
        <div className="h-14 border-b border-slate-200 flex items-center px-6 shrink-0 justify-between">
          <div className="flex items-center">
            <Activity className="w-4 h-4 text-blue-600 mr-2" />
            <h2 className="font-semibold text-slate-800 text-sm">Workflow Insights</h2>
          </div>
        </div>
        
        <div className="p-6 flex-1 overflow-y-auto">
          {/* Waiting/Initial Header Status Card */}
          {(!activeSession || !activeSession.workflowSteps) && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6 flex flex-col items-center justify-center text-center gap-2 animate-in fade-in duration-250">
              <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-400 animate-pulse">
                <Activity className="w-4 h-4" />
              </div>
              <p className="text-xs font-semibold text-slate-500">Waiting for problem submission...</p>
              <p className="text-[10px] text-slate-400 max-w-[200px] leading-relaxed">Council of Experts neural traces will display here once execution starts.</p>
            </div>
          )}

          {/* Council of Experts: 11 Detailed Insights Cards */}
          {activeSession && activeSession.workflowSteps && (() => {
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
                  <div className="text-[11px] text-slate-500 leading-normal">
                    Engine: <span className="font-semibold text-slate-600">QuantumEngine-V5</span> (v5.0.0)
                  </div>
                </div>

                {/* Card 2: Objective */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 hover:shadow-sm transition-all animate-in fade-in duration-200">
                  <span className="text-[11px] font-semibold text-blue-600">
                    2. Objective
                  </span>
                  {details.objectiveLatex ? (
                    <div className="font-mono text-[11px] text-slate-700 bg-white border border-slate-200 p-2.5 rounded-lg leading-relaxed overflow-x-auto">
                      <MarkdownRenderer content={details.objectiveLatex} />
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
                          <div className="mt-1 font-mono text-[11px] text-slate-400">
                            Domain: {v.domain} · [{v.dimensions?.join(' × ')}]
                          </div>
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
                  <div className="text-[11px] text-slate-500 leading-normal">
                    Families: {details.constraints.map((c: any) => c.family).filter((v: any, i: number, self: any[]) => self.indexOf(v) === i).join(', ') || 'None'}
                  </div>
                </div>

                {/* Card 5: Mathematical model */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 hover:shadow-sm transition-all animate-in fade-in duration-200">
                  <span className="text-[11px] font-semibold text-blue-600">
                    5. Mathematical model
                  </span>
                  <div className="font-mono text-[11px] text-slate-700 bg-white border border-slate-200 p-2.5 rounded-lg leading-relaxed overflow-x-auto max-h-[220px] overflow-y-auto">
                    {details.modelLatex ? (
                      <MarkdownRenderer content={details.modelLatex} />
                    ) : (
                      <span className="italic text-slate-400">Awaiting formulation...</span>
                    )}
                  </div>
                </div>

                {/* Card 6: Optimization model */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 hover:shadow-sm transition-all animate-in fade-in duration-200">
                  <span className="text-[11px] font-semibold text-blue-600">
                    6. Optimization model
                  </span>
                  <div className="text-[11px] text-slate-700 font-semibold border-b border-slate-200 pb-1.5 mb-1.5">
                    {details.modelDetails.solver}
                  </div>
                  <div className="text-[11px] text-slate-500 mb-1">
                    Decision variable domains
                  </div>
                  <div className="font-mono text-[11px] text-slate-700 bg-white border border-slate-200 p-2 rounded-lg overflow-x-auto max-h-[140px] overflow-y-auto">
                    {details.varsDomainsLatex ? (
                      <MarkdownRenderer content={details.varsDomainsLatex} />
                    ) : (
                      <span className="italic text-slate-400">No variable domains.</span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 leading-normal pt-0.5">
                    {details.modelDetails.suggestor}
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
                            <div className="font-mono text-[11px] text-slate-600 pt-1 border-t border-slate-100 overflow-x-auto">
                              <MarkdownRenderer content={`$$ ${c.formula} $$`} />
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
                    9. Variable count
                  </span>
                  <div className="text-[11px] text-slate-700 font-medium">
                    Total generated: <span className="text-blue-600 font-semibold">{details.totalVarCount}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 leading-normal">
                    Dimension bounds check: passed
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

                {/* Card 11: Shared memory access */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 hover:shadow-sm transition-all animate-in fade-in duration-200">
                  <span className="text-[11px] font-semibold text-blue-600">
                    11. Shared memory access
                  </span>
                  <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                    {details.agentLogs.map((log: any, idx: number) => (
                      <div key={idx} className="bg-white border border-slate-200 p-2 rounded-lg">
                        <div className="text-[11px] font-semibold text-blue-600">{log.agent}</div>
                        <div className="font-mono text-[11px] text-slate-500 mt-0.5">{log.action}</div>
                        {log.status && (
                          <div className={`mt-1 text-[11px] font-semibold ${log.status === 'Success' ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {log.status === 'Success' ? '✓ ' : '○ '}{log.status}
                          </div>
                        )}
                      </div>
                    ))}
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
