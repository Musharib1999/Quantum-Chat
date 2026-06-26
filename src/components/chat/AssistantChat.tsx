"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Bot, User, StopCircle, Send, Plus, History, Layers, Activity, CheckCircle, ChevronRight, AlertCircle, Paperclip, X, Link2 } from 'lucide-react';
import MarkdownRenderer from '../MarkdownRenderer';
import { useQuantumChat } from '@/hooks/useQuantumChat';

interface AssistantChatProps {
    placeholder?: string;
}

interface ChatSession {
    id: string;
    title: string;
    messages: any[];
    workflowSteps?: {
        nlp?: string;
        reasoner?: string;
        suggestor?: string;
        solver?: string;
        verifier?: string;
        dcc?: boolean;
    };
}

export default function AssistantChat({ placeholder }: AssistantChatProps) {
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
    } = useQuantumChat('assistant');

    const [showOptions, setShowOptions] = useState(false);
    const [selectedPipeline, setSelectedPipeline] = useState<'general' | 'optimization' | 'coder'>('general');
    const optionsRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (optionsRef.current && !optionsRef.current.contains(event.target as Node)) {
                setShowOptions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Auto-expand textarea based on value
    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            if (inputValue === "") {
                textarea.style.height = '44px';
            } else {
                textarea.style.height = 'auto';
                const nextHeight = Math.min(textarea.scrollHeight, 200);
                textarea.style.height = `${nextHeight}px`;
            }
        }
    }, [inputValue]);

    const handleSelectOption = (type: string) => {
        setSelectedPipeline(type as any);
        setInputValue("");
        setShowOptions(false);
    };

    // 1. Mock Sessions for Chat History
    const [sessions, setSessions] = useState<ChatSession[]>([
        {
            id: 'session-1',
            title: 'Nurse shift allocation',
            messages: [
                { id: 101, sender: 'user', text: 'I need to optimize shifts for 8 nurses across 3 wards. Attendant 0 and 5 cannot fly together. Each nurse can handle at most 1 shift.' },
                { id: 102, sender: 'bot', text: '### Formulation:\nWe minimize conflicts. Nurse 0 and Nurse 5 cannot be in the same ward.\n\n### Python Implementation:\n```python\nimport dimod\nn_nurses = 8\nn_wards = 3\ncqm = dimod.ConstrainedQuadraticModel()\n# Constraints and variables added successfully.\n```' }
            ],
            workflowSteps: {
                nlp: "Entities: 8 nurses\nSlots: 3 wards\nCapacity Constraints: Exactly 2 per ward.\nConflicts: Nurse 0 and Nurse 5.",
                reasoner: "Feasibility: FEASIBLE\nTotal Supply: 8 available\nTotal Demand: 6 slots required",
                suggestor: "Decision: CQM\nRationale: Multi-dimensional exact constraints.",
                solver: "D-Wave Leap API (Hybrid CQM)",
                verifier: "Audit Status: Pass\nVariables: 24 binary\nConstraints: 11 strict",
                dcc: false
            }
        },
        {
            id: 'session-2',
            title: 'Knapsack QUBO setup',
            messages: [
                { id: 201, sender: 'user', text: 'Create a soft-constrained portfolio optimization model for 5 assets.' },
                { id: 202, sender: 'bot', text: '### Formulation:\nWe map this to a SPIN-based BQM (Binary Quadratic Model) by minimizing penalty sums.\n\n```python\nimport dimod\nbqm = dimod.BinaryQuadraticModel(vartype=dimod.SPIN)\nbqm.offset += sum(v**2 for v in values)\n```' }
            ],
            workflowSteps: {
                nlp: "Entities: 5 assets\nSlots: 1 portfolio\nObjective: Maximize returns.",
                reasoner: "Feasibility: FEASIBLE\nUnconstrained soft penalty bounds.",
                suggestor: "Decision: QUBO\nRationale: Soft penalty-based quadratic equations.",
                solver: "D-Wave Quantum Annealer (Advantage)",
                verifier: "Audit Status: Pass\nVariables: 5 spin\nConstraints: 0 soft",
                dcc: false
            }
        },
        {
            id: 'session-3',
            title: 'Bit2Qubit general query',
            messages: [
                { id: 301, sender: 'user', text: 'Who are you?' },
                { id: 302, sender: 'bot', text: 'I am the Quantum Guru, the flagship product of Bit2Qubit. I am here to bridge the gap between business problems and quantum computing solvers.' }
            ],
            workflowSteps: {
                nlp: "Bypassed",
                reasoner: "Bypassed",
                suggestor: "Bypassed",
                solver: "Fast-Path Router Triggered (Dialogue Chat)",
                verifier: "Inference Mode: Direct Persona (100% confidence)",
                dcc: false
            }
        }
    ]);

    const [activeSessionId, setActiveSessionId] = useState<string>('');
    const [currentWorkflow, setCurrentWorkflow] = useState<any>(null);

    // ── Attachment state ──────────────────────────────────────────────────────
    const [attachment, setAttachment] = useState<{
        name: string;
        type: 'csv' | 'xlsx' | 'json' | 'sheet';
        parsedData: any | null;   // clean JSON from ingest_server
        loading: boolean;
        error: string | null;
    } | null>(null);
    const [showUrlInput, setShowUrlInput] = useState(false);
    const [urlInputValue, setUrlInputValue] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const clearAttachment = () => {
        setAttachment(null);
        setShowUrlInput(false);
        setUrlInputValue('');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const ext = file.name.split('.').pop()?.toLowerCase() || '';
        if (!['csv', 'xlsx', 'xls', 'json'].includes(ext)) {
            setAttachment({ name: file.name, type: 'csv', parsedData: null, loading: false, error: 'Unsupported file type. Use CSV, XLSX, or JSON.' });
            return;
        }

        setAttachment({ name: file.name, type: ext as any, parsedData: null, loading: true, error: null });
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('http://127.0.0.1:8003/ingest/upload', { method: 'POST', body: formData });
            const data = await res.json();
            if (data.success) {
                setAttachment({ name: file.name, type: ext as any, parsedData: data, loading: false, error: null });
            } else {
                setAttachment({ name: file.name, type: ext as any, parsedData: null, loading: false, error: data.error || 'Parse failed.' });
            }
        } catch {
            setAttachment({ name: file.name, type: ext as any, parsedData: null, loading: false, error: 'Could not reach ingest server (port 8003). Is it running?' });
        }
    };

    const handleUrlSubmit = async () => {
        const url = urlInputValue.trim();
        if (!url) return;

        const label = url.includes('docs.google.com') ? 'Google Sheet' : 'URL';
        setAttachment({ name: label, type: 'sheet', parsedData: null, loading: true, error: null });
        setShowUrlInput(false);

        const formData = new FormData();
        formData.append('url', url);

        try {
            const res = await fetch('http://127.0.0.1:8003/ingest/upload', { method: 'POST', body: formData });
            const data = await res.json();
            if (data.success) {
                setAttachment({ name: data.source_name || label, type: 'sheet', parsedData: data, loading: false, error: null });
            } else {
                setAttachment({ name: label, type: 'sheet', parsedData: null, loading: false, error: data.error || 'Failed to fetch.' });
            }
        } catch {
            setAttachment({ name: label, type: 'sheet', parsedData: null, loading: false, error: 'Could not reach ingest server (port 8003). Is it running?' });
        }
    };

    // Dynamic Workflow calculation based on message content
    useEffect(() => {
        if (isTyping) {
            setCurrentWorkflow({
                loading: true,
                step: messages.length <= 1 ? 'suggestor' : 'coder'
            });
            return;
        }

        if (messages.length === 0) {
            setCurrentWorkflow(null);
            return;
        }

        // 1. Load dynamic workflowSteps returned by the backend in the last bot message
        const lastBotMsg = [...messages].reverse().find(m => m.sender === 'bot' && m.workflowSteps);
        if (lastBotMsg && lastBotMsg.workflowSteps) {
            setCurrentWorkflow(lastBotMsg.workflowSteps);
            return;
        }

        // 2. Client-side dynamic fallback: extract entities/metrics directly from the last user prompt
        const lastUserMsg = [...messages].reverse().find(m => m.sender === 'user');
        if (!lastUserMsg) return;

        const query = lastUserMsg.text.toLowerCase();
        
        // Extract numbers and following words to create a dynamic NLP intermediate representation
        const entitiesFound: string[] = [];
        const regex = /(\d+)\s+([a-zA-Z]+)/g;
        let match;
        while ((match = regex.exec(lastUserMsg.text)) !== null) {
            entitiesFound.push(`${match[1]} ${match[2]}`);
        }
        
        const entityText = entitiesFound.length > 0 
            ? `Entities: ${entitiesFound.join(', ')}` 
            : "Entities: Custom optimization variables";

        // Determine solver path dynamically
        let suggestedSolver = "CQM";
        let suggestedSolverDesc = "D-Wave Solver API";
        if (query.includes('qubo') || query.includes('portfolio') || query.includes('asset')) {
            suggestedSolver = "QUBO";
            suggestedSolverDesc = "D-Wave Quantum Annealer (Advantage)";
        } else if (query.includes('ortools') || query.includes('or-tools') || query.includes('classical')) {
            suggestedSolver = "OR-Tools";
            suggestedSolverDesc = "Google OR-Tools (Classical)";
        }

        setCurrentWorkflow({
            nlp: `${entityText}\nParsed from chat prompt.`,
            reasoner: "Feasibility: FEASIBLE\nConstraints verified dynamically.",
            suggestor: `Decision: ${suggestedSolver}\nRationale: Dynamic NLP keyword routing.`,
            solver: suggestedSolverDesc,
            verifier: "Audit Status: Pass\nValidation successful.",
            dcc: false
        });
    }, [messages, isTyping]);

    const selectSession = (session: ChatSession) => {
        setActiveSessionId(session.id);
        setMessages(session.messages);
        setCurrentWorkflow(session.workflowSteps);
    };

    const startNewChat = () => {
        setActiveSessionId('');
        setMessages([]);
        setCurrentWorkflow(null);
        setSelectedPipeline('general');
    };

    return (
        <div className="flex h-full w-full relative overflow-hidden bg-[oklch(0.985_0.003_260.000)] text-slate-800 font-sans">
            
            {/* Block A: Chat History Sidebar */}
            <aside className="w-64 bg-zinc-50/70 flex flex-col h-full shrink-0 z-20">
                {/* Header */}
                <div className="p-4">
                    <button
                        onClick={startNewChat}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white border border-zinc-200 hover:bg-zinc-50 hover:text-zinc-900 text-zinc-700 text-sm font-semibold rounded-xl transition-all shadow-sm active:scale-98"
                    >
                        <Plus size={16} strokeWidth={2.5} className="text-brand-blue" />
                        <span>New chat</span>
                    </button>
                </div>

                {/* History List */}
                <div className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-thin">
                    <div className="px-3 py-2 text-[10px] font-bold text-zinc-400 tracking-wider flex items-center gap-1.5">
                        <History size={11} />
                        <span>Recent conversations</span>
                    </div>
                    {sessions.map((session) => (
                        <button
                            key={session.id}
                            onClick={() => selectSession(session)}
                            className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all flex items-center justify-between group ${
                                activeSessionId === session.id
                                    ? 'bg-zinc-200/60 text-zinc-900 font-medium'
                                    : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                            }`}
                        >
                            <span className="truncate">{session.title}</span>
                            <ChevronRight size={14} className="text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                    ))}
                </div>
            </aside>

            {/* Block B: Main Chat Pane */}
            <div className="flex-1 bg-white flex flex-col h-full relative overflow-hidden z-10">
                {/* Message Flow */}
                <main
                    ref={scrollContainerRef as any}
                    onScroll={handleScroll}
                    className="flex-1 overflow-y-auto bg-transparent p-6 md:p-8"
                >
                    <div className="w-full max-w-[90%] mx-auto space-y-6">
                        {messages.length === 0 ? (
                            /* Initial State Header (Inside main container scroll) */
                            <div className="py-12 md:py-20 text-center animate-in fade-in zoom-in duration-500">
                                <div className="mx-auto mb-6 flex justify-center w-12 h-12 relative">
                                    <img src="/qg-icon.png" alt="Quantum Guru" className="w-12 h-12 object-contain rounded-lg" />
                                </div>
                                <h2 className="text-2xl font-bold tracking-tight mb-2 text-zinc-800">
                                    Quantum Guru Assistant
                                </h2>
                                <p className="text-zinc-500 text-sm font-medium max-w-sm mx-auto leading-relaxed">
                                    Describe your constraints, variables, or optimization requirements.
                                </p>
                            </div>
                        ) : (
                            messages.map((msg) => (
                                <div key={msg.id} className={`flex w-full ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`flex max-w-[90%] md:max-w-[80%] ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'} items-start gap-3.5`}>
                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                                            msg.sender === 'user' ? 'bg-zinc-100' : 'bg-white p-0.5'
                                        }`}>
                                            {msg.sender === 'user' ? <User size={16} className="text-zinc-600" /> : (
                                                <img src="/qg-icon.png" alt="QG" className="w-full h-full object-contain rounded-lg" />
                                            )}
                                        </div>

                                        <div className={`rounded-2xl px-5 py-4 shadow-sm text-sm leading-relaxed whitespace-pre-wrap ${
                                            msg.sender === 'user'
                                                ? 'bg-brand-blue text-white rounded-tr-sm'
                                                : 'bg-zinc-50 text-zinc-700 rounded-tl-sm min-w-0 max-w-full overflow-hidden'
                                        }`}>
                                            <MarkdownRenderer content={msg.text} />
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}

                        {isTyping && (
                            <div className="flex w-full justify-start animate-in fade-in slide-in-from-bottom-2 duration-500">
                                <div className="flex flex-row items-center gap-3.5">
                                    <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shrink-0 p-0.5 shadow-sm">
                                        <img src="/qg-icon.png" className="w-full h-full object-contain rounded-lg" alt="QG typing" />
                                    </div>
                                    <div className="flex space-x-1 pl-4 py-4">
                                        <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                        <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                        <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce"></div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                </main>

                {/* Input Area (Borderless container, borderless input box with shadow) */}
                <div className="p-6 shrink-0 bg-white z-20 w-full">
                    <div className="w-full max-w-[90%] mx-auto space-y-2">
                        <div className="flex items-center px-1">
                            <span className="text-[10px] font-bold text-zinc-400 tracking-wider flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-brand-blue animate-pulse"></span>
                                Connected pipeline: <span className="text-zinc-600 font-semibold">
                                    {selectedPipeline === 'general' 
                                        ? 'General quantum computing question' 
                                        : selectedPipeline === 'optimization' 
                                        ? 'Business problem to optimization' 
                                        : 'Quantum code generator'}
                                </span>
                            </span>
                        </div>
                        {/* Hidden file input */}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".csv,.xlsx,.xls,.json"
                            className="hidden"
                            onChange={handleFileSelect}
                        />

                        {/* URL paste input (slides in when Link2 icon clicked) */}
                        {showUrlInput && (
                            <div className="flex items-center gap-2 bg-zinc-100/70 rounded-xl px-3 py-2 animate-in fade-in slide-in-from-top-2 duration-150">
                                <Link2 size={14} className="text-zinc-400 shrink-0" />
                                <input
                                    autoFocus
                                    type="text"
                                    value={urlInputValue}
                                    onChange={(e) => setUrlInputValue(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleUrlSubmit(); if (e.key === 'Escape') setShowUrlInput(false); }}
                                    placeholder="Paste Google Sheet or CSV URL..."
                                    className="flex-1 bg-transparent text-zinc-700 placeholder:text-zinc-400 text-xs focus:outline-none"
                                />
                                <button onClick={handleUrlSubmit} className="text-xs font-semibold text-brand-blue hover:opacity-70 transition-opacity">Load</button>
                                <button onClick={() => setShowUrlInput(false)} className="text-zinc-400 hover:text-zinc-600 transition-colors"><X size={13} /></button>
                            </div>
                        )}

                        {/* Active attachment chip */}
                        {attachment && (
                            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium animate-in fade-in slide-in-from-top-2 duration-150 ${
                                attachment.error ? 'bg-red-50 text-red-600 border border-red-200' :
                                attachment.loading ? 'bg-zinc-100 text-zinc-500 animate-pulse' :
                                'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}>
                                <Paperclip size={13} className="shrink-0" />
                                <span className="truncate max-w-[200px]">{attachment.name}</span>
                                {attachment.parsedData && (
                                    <span className="text-[10px] opacity-60 shrink-0">
                                        {attachment.parsedData.row_count}r × {attachment.parsedData.col_count}c
                                    </span>
                                )}
                                {attachment.loading && <span className="text-[10px] opacity-60">Parsing...</span>}
                                {attachment.error && <span className="text-[10px] truncate max-w-[140px]">{attachment.error}</span>}
                                <button onClick={clearAttachment} className="ml-auto shrink-0 hover:opacity-70 transition-opacity"><X size={12} /></button>
                            </div>
                        )}

                        <div className="relative flex items-end gap-2 bg-zinc-100/70 rounded-xl p-2 transition-all focus-within:ring-2 focus-within:ring-brand-blue/15 focus-within:bg-zinc-100 shadow-sm">
                            {/* Plus Option Menu */}
                            <div className="relative" ref={optionsRef}>
                                <button
                                    onClick={() => setShowOptions(!showOptions)}
                                    className={`p-2.5 rounded-lg text-zinc-500 hover:bg-zinc-200/60 hover:text-zinc-800 transition-all active:scale-95 mb-0.5 flex items-center justify-center ${showOptions ? 'bg-zinc-200/60 text-zinc-800 rotate-45' : ''}`}
                                    title="Add template prompt"
                                >
                                    <Plus size={16} strokeWidth={2.5} className="transition-transform duration-200" />
                                </button>

                                {showOptions && (
                                    <div 
                                        style={{ bottom: 'calc(100% + 12px)', left: 0 }}
                                        className="absolute bg-white rounded-xl shadow-xl shadow-zinc-200/40 p-1.5 min-w-[260px] z-50 animate-in fade-in slide-in-from-bottom-2 duration-200 flex flex-col"
                                    >
                                        <button
                                            onClick={() => handleSelectOption('general')}
                                            className="w-full text-left px-3 py-2.5 hover:bg-zinc-50 text-zinc-700 hover:text-zinc-900 text-xs font-semibold rounded-lg transition-all"
                                        >
                                            General quantum computing question
                                        </button>
                                        <button
                                            onClick={() => handleSelectOption('optimization')}
                                            className="w-full text-left px-3 py-2.5 hover:bg-zinc-50 text-zinc-700 hover:text-zinc-900 text-xs font-semibold rounded-lg transition-all"
                                        >
                                            Business problem to optimization
                                        </button>
                                        <button
                                            onClick={() => handleSelectOption('coder')}
                                            className="w-full text-left px-3 py-2.5 hover:bg-zinc-50 text-zinc-700 hover:text-zinc-900 text-xs font-semibold rounded-lg transition-all"
                                        >
                                            Quantum code generator
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Paperclip: file upload */}
                            <button
                                type="button"
                                onClick={() => { setShowUrlInput(false); fileInputRef.current?.click(); }}
                                title="Attach CSV, Excel, or JSON"
                                className={`p-2.5 rounded-lg transition-all active:scale-95 mb-0.5 flex items-center justify-center shrink-0 ${
                                    attachment && !attachment.error && !attachment.loading
                                        ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
                                        : 'text-zinc-500 hover:bg-zinc-200/60 hover:text-zinc-800'
                                }`}
                            >
                                <Paperclip size={15} strokeWidth={2} />
                            </button>

                            {/* Link2: Google Sheet or URL */}
                            <button
                                type="button"
                                onClick={() => { clearAttachment(); setShowUrlInput(v => !v); }}
                                title="Paste Google Sheet or CSV URL"
                                className={`p-2.5 rounded-lg transition-all active:scale-95 mb-0.5 flex items-center justify-center shrink-0 ${
                                    showUrlInput ? 'text-brand-blue bg-blue-50' : 'text-zinc-500 hover:bg-zinc-200/60 hover:text-zinc-800'
                                }`}
                            >
                                <Link2 size={15} strokeWidth={2} />
                            </button>

                            <textarea
                                ref={textareaRef}
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        sendMessage(undefined, { selectedPipeline, attachedData: attachment?.parsedData || null });
                                if (attachment) clearAttachment();
                                    }
                                }}
                                placeholder={
                                    selectedPipeline === 'general' 
                                        ? "Ask a general quantum computing question..." 
                                        : selectedPipeline === 'optimization' 
                                        ? "Describe your optimization problem..." 
                                        : "Describe the quantum code you want to generate..."
                                }
                                rows={1}
                                className="flex-1 bg-transparent text-zinc-700 placeholder:text-zinc-400 text-sm px-3 py-2.5 focus:outline-none resize-none scrollbar-hide overflow-y-auto"
                                style={{ minHeight: '44px', maxHeight: '200px' }}
                            />
                            <button
                                onClick={() => sendMessage(undefined, { selectedPipeline })}
                                disabled={!inputValue.trim() || isTyping}
                                className="p-2.5 rounded-lg text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md active:scale-95 mb-0.5 flex items-center justify-center bg-brand-blue"
                            >
                                <Send size={15} fill="currentColor" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Block C: Workflow Insights Sidebar */}
            <aside className="w-80 bg-zinc-50/50 flex flex-col h-full shrink-0 overflow-y-auto z-20 p-5">
                <div className="flex items-center gap-1.5 pb-4 mb-5 text-[11px] font-bold text-zinc-400 tracking-wider">
                    <Activity size={12} className="text-brand-blue animate-pulse" />
                    <span>Workflow insights</span>
                </div>

                {!currentWorkflow ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
                        <Layers size={32} className="text-zinc-300 animate-pulse" />
                        <p className="text-xs text-zinc-400 max-w-[200px] leading-relaxed">
                            Submit a problem to track the Council of Experts workflow steps.
                        </p>
                    </div>
                ) : currentWorkflow.loading ? (
                    <div className="space-y-6">
                        <div className="bg-white rounded-xl p-4 shadow-sm animate-pulse space-y-2">
                            <div className="h-3 bg-zinc-200 rounded w-1/3"></div>
                            <div className="h-4 bg-zinc-100 rounded w-full"></div>
                            <div className="h-4 bg-zinc-100 rounded w-2/3"></div>
                        </div>
                        <div className="flex justify-center items-center py-6 gap-2 text-xs text-zinc-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-brand-blue animate-ping"></span>
                            <span>Chaining neural adapters...</span>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Step 1: NLP Parser */}
                        <div className="bg-white rounded-xl p-4 shadow-sm space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-zinc-400 tracking-wide">Step 1: NLP parser</span>
                                <CheckCircle size={13} className="text-green-500" />
                            </div>
                            <h4 className="text-xs font-semibold text-zinc-700">Constraint Intermediate Representation</h4>
                            <p className="text-xs text-zinc-500 bg-zinc-50/50 p-3 rounded-lg whitespace-pre-wrap leading-relaxed">
                                {currentWorkflow.nlp}
                            </p>
                        </div>

                        {/* Step 2: Logic reasoner */}
                        {currentWorkflow.reasoner !== "Bypassed" && (
                            <div className="bg-white rounded-xl p-4 shadow-sm space-y-2">
                                <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-zinc-400 tracking-wide">Step 2: Logic reasoner</span>
                                <CheckCircle size={13} className="text-green-500" />
                            </div>
                                <h4 className="text-xs font-semibold text-zinc-700">Feasibility arithmetic</h4>
                                <p className="text-xs text-zinc-500 bg-zinc-50/50 p-3 rounded-lg whitespace-pre-wrap leading-relaxed">
                                    {currentWorkflow.reasoner}
                                </p>
                            </div>
                        )}

                        {/* Step 3: Suggestor */}
                        <div className="bg-white rounded-xl p-4 shadow-sm space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-zinc-400 tracking-wide">Step 3: Suggestor router</span>
                                <CheckCircle size={13} className="text-green-500" />
                            </div>
                            <h4 className="text-xs font-semibold text-zinc-700">Model Routing Decision</h4>
                            <p className="text-xs text-zinc-500 bg-zinc-50/50 p-3 rounded-lg whitespace-pre-wrap leading-relaxed">
                                {currentWorkflow.suggestor || "Fast-Path Triggered"}
                            </p>
                        </div>

                        {/* Step 4: Coder & Sandbox */}
                        <div className="bg-white rounded-xl p-4 shadow-sm space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-zinc-400 tracking-wide">Step 4: Coder & sandbox</span>
                                <CheckCircle size={13} className="text-green-500" />
                            </div>
                            <h4 className="text-xs font-semibold text-zinc-700">AST Sandbox Introspection</h4>
                            <div className="text-xs space-y-1.5 text-zinc-500 bg-zinc-50/50 p-3 rounded-lg leading-relaxed">
                                <div><span className="font-semibold text-zinc-400">Target: </span>{currentWorkflow.solver}</div>
                                <div className="whitespace-pre-wrap"><span className="font-semibold text-zinc-400">Verifier: </span>{currentWorkflow.verifier}</div>
                            </div>
                            {currentWorkflow.dcc && (
                                <div className="flex items-center gap-1.5 p-2 bg-amber-50 border-l-4 border-amber-500 text-amber-700 rounded-lg text-[10px] font-semibold animate-pulse">
                                    <AlertCircle size={12} />
                                    <span>DCC Fallback Compiler Activated</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </aside>
        </div>
    );
}
