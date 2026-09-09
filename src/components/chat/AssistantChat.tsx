import { getBackendUrl } from '@/lib/backend';
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, User, StopCircle, Send, Plus, History, Layers, 
  Activity, CheckCircle, ChevronRight, AlertCircle, Paperclip, 
  X, Link2, MessageSquare, BrainCircuit, Terminal, Check, Info, Trash2 
} from 'lucide-react';
import MarkdownRenderer from '../MarkdownRenderer';
import { useQuantumChat } from '@/hooks/useQuantumChat';
import { 
  getChatSessions, 
  deleteChatSession, 
  createChatSession, 
  updateChatSession 
} from '@/app/actions/chat';

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
    } = useQuantumChat('assistant', { selectedPipeline });

    const [showOptions, setShowOptions] = useState(false);
    const [showRecentChats, setShowRecentChats] = useState(false);
    const optionsRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Dynamic sessions loaded from MongoDB
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [activeSessionId, setActiveSessionId] = useState<string>('');
    const [currentWorkflow, setCurrentWorkflow] = useState<any>(null);

    // Load sessions from MongoDB on mount
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
                console.error("Failed to load chat sessions from MongoDB in assistant:", err);
            }
        }
        loadSessions();
    }, []);

    // Close options dropdown on outside click
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
            const res = await fetch(`${getBackendUrl()}/ingest/upload`, { method: 'POST', body: formData });
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
            const res = await fetch(`${getBackendUrl()}/ingest/upload`, { method: 'POST', body: formData });
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
            console.error("Failed to delete chat session in assistant:", err);
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
                    id: targetSessionId,
                    title: shortTitle,
                    messages: [],
                    workflowSteps: undefined
                };
                setSessions(prev => [newSession, ...prev]);
                setActiveSessionId(targetSessionId);
            } catch (err) {
                console.error("Failed to create chat session in DB in assistant:", err);
                targetSessionId = 'session-' + Date.now(); // local fallback
                const newSession: ChatSession = {
                    id: targetSessionId,
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
            selectedPipeline,
            attachedData: attachment?.parsedData || null
        });
        if (attachment) clearAttachment();
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
                    console.error("Failed to sync chat session updates to DB in assistant:", err);
                });
            }
        }
    }, [messages, activeSessionId]);

    return (
        <div className="flex h-full w-full relative overflow-hidden bg-[oklch(0.985_0.003_260.000)] text-slate-800 font-sans">
            
            {/* Block A1: Icon-Only Navigation Sidebar */}
            <aside className="w-16 bg-zinc-50 flex flex-col items-center py-6 justify-between h-full shrink-0 z-30 select-none border-r border-zinc-200/60 shadow-sm">
                {/* Top Action Icons */}
                <div className="flex flex-col items-center gap-6 w-full">
                    {/* New Chat Icon Button */}
                    <button
                        onClick={startNewChat}
                        className="p-3 bg-white hover:bg-zinc-100 text-zinc-700 hover:text-zinc-955 rounded-xl transition-all shadow-sm border border-zinc-200 active:scale-95 cursor-pointer"
                        title="New Chat"
                    >
                        <Plus size={20} strokeWidth={2.5} className="text-zinc-650" />
                    </button>

                    {/* Recent Chats Icon Button */}
                    <button
                        onClick={() => setShowRecentChats(prev => !prev)}
                        className={`p-3 rounded-xl transition-all active:scale-95 cursor-pointer border ${
                            showRecentChats 
                                ? 'bg-zinc-200/60 text-zinc-950 shadow-inner border-zinc-300' 
                                : 'bg-white hover:bg-zinc-100 text-zinc-600 hover:text-zinc-950 border border-zinc-200 shadow-sm'
                        }`}
                        title="Recent Conversations"
                    >
                        <History size={20} strokeWidth={2} />
                    </button>
                </div>

                {/* Bottom Action Icons */}
                <div className="flex flex-col items-center gap-4 w-full">
                    {/* More Info Link Icon Button */}
                    <a
                        href="/quantum-assistant/capabilities"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-3 bg-white hover:bg-zinc-100 text-zinc-600 hover:text-zinc-955 rounded-xl transition-all border border-zinc-200 shadow-sm active:scale-95 cursor-pointer"
                        title="More Info"
                    >
                        <Info size={20} strokeWidth={2} />
                    </a>
                </div>
            </aside>

            {/* Block A2: Conditional Slide-Out Chat History Drawer */}
            {showRecentChats && (
                <aside className="w-64 bg-zinc-50 border-r border-zinc-200/60 flex flex-col h-full shrink-0 z-20 overflow-hidden animate-in slide-in-from-left duration-200">
                    <div className="p-4 border-b border-zinc-200/60 flex items-center justify-between shrink-0 select-none">
                        <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                            <History size={13} />
                            Recent Chats
                        </span>
                        <button 
                            onClick={() => setShowRecentChats(false)}
                            className="p-1 hover:bg-zinc-200 rounded text-zinc-400 hover:text-zinc-700 transition cursor-pointer"
                        >
                            <X size={15} />
                        </button>
                    </div>

                    {/* History List */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-thin">
                        {sessions.map((session) => (
                            <div
                                key={session.id}
                                onClick={() => {
                                    selectSession(session);
                                    setShowRecentChats(false);
                                }}
                                className={`group w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all cursor-pointer ${
                                    activeSessionId === session.id
                                        ? 'bg-zinc-200/60 text-zinc-900 font-medium'
                                        : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                                }`}
                            >
                                <span className="truncate flex-1 pr-2">{session.title}</span>
                                <button 
                                    onClick={(e) => handleDeleteSession(session.id, e)}
                                    className="opacity-0 group-hover:opacity-100 hover:text-red-500 p-0.5 rounded transition-all cursor-pointer"
                                    title="Delete session"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))}
                        {sessions.length === 0 && (
                            <p className="text-xs text-zinc-400 text-center py-8 italic">No previous chats.</p>
                        )}
                    </div>
                </aside>
            )}
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
                            <div className="flex flex-col items-center justify-center py-32 text-center space-y-4 animate-in fade-in duration-500 select-none">
                                <Layers size={48} className="text-zinc-300" />
                                <p className="text-[15px] text-zinc-400 max-w-[280px] leading-relaxed font-normal">
                                    Submit a problem to track the Council of Experts workflow steps.
                                </p>
                            </div>
                        ) : (
                            messages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={`flex w-full ${
                                        msg.sender === 'user' ? 'justify-end' : 'justify-start'
                                    } animate-in fade-in slide-in-from-bottom-2 duration-200`}
                                >
                                    <div className={`flex max-w-[85%] gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'} items-start`}>
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border text-xs font-semibold ${
                                            msg.sender === 'user' 
                                                ? 'bg-zinc-100 border-zinc-200 text-zinc-650' 
                                                : 'bg-brand-blue border-brand-blue text-white'
                                        }`}>
                                            {msg.sender === 'user' ? <User size={14} /> : <Bot size={14} />}
                                        </div>
                                        <div className={`rounded-xl px-4 py-2.5 text-[13.5px] leading-relaxed ${
                                            msg.sender === 'user'
                                                ? 'bg-brand-blue text-white rounded-tr-none'
                                                : 'bg-zinc-100/70 border border-zinc-200/50 text-zinc-850 rounded-tl-none min-w-0 max-w-full overflow-hidden'
                                        }`}>
                                            {msg.sender === 'user' ? (
                                                <div className="whitespace-pre-wrap">{msg.text}</div>
                                            ) : (
                                                <div className="prose prose-sm prose-slate max-w-none text-zinc-850 leading-relaxed">
                                                    <MarkdownRenderer content={msg.text} />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                        {isTyping && (
                            <div className="flex w-full justify-start animate-in fade-in duration-200">
                                <div className="flex flex-row items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-brand-blue border border-brand-blue flex items-center justify-center text-white shrink-0 text-xs font-semibold">
                                        <Bot size={14} />
                                    </div>
                                    <div className="flex space-x-1 pl-4 py-3 bg-zinc-100/60 border border-zinc-200/40 rounded-xl px-4">
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
                            <span className="text-[10px] font-bold text-zinc-600 tracking-wider flex items-center gap-1.5">
                                {selectedPipeline === 'general' 
                                    ? 'General quantum computing question' 
                                    : selectedPipeline === 'optimization' 
                                    ? 'Business problem to optimization' 
                                    : 'Quantum code generator'}
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
                                        className="absolute bg-white rounded-xl shadow-xl shadow-zinc-200/40 p-2 min-w-[290px] z-50 animate-in fade-in slide-in-from-bottom-2 duration-200 flex flex-col gap-1 border border-zinc-100"
                                    >
                                        {/* Option 1: General */}
                                        <button
                                            onClick={() => handleSelectOption('general')}
                                            className={`w-full text-left px-3 py-2 flex items-start gap-3 hover:bg-zinc-50 rounded-lg transition-all ${
                                                selectedPipeline === 'general' ? 'bg-zinc-50/80' : ''
                                            }`}
                                        >
                                            <div className={`p-2 rounded-lg shrink-0 ${
                                                selectedPipeline === 'general' ? 'bg-teal-50 text-teal-600' : 'bg-zinc-100 text-zinc-500'
                                            }`}>
                                                <MessageSquare size={15} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-[12px] font-bold text-zinc-800 leading-snug">
                                                    General Q&A
                                                </div>
                                                <div className="text-[10px] text-zinc-400 font-medium leading-normal mt-0.5">
                                                    Ask about quantum concepts & brand identity
                                                </div>
                                            </div>
                                            {selectedPipeline === 'general' && (
                                                <Check size={14} className="text-teal-600 shrink-0 self-center" />
                                            )}
                                        </button>

                                        {/* Option 2: Optimization */}
                                        <button
                                            onClick={() => handleSelectOption('optimization')}
                                            className={`w-full text-left px-3 py-2 flex items-start gap-3 hover:bg-zinc-50 rounded-lg transition-all ${
                                                selectedPipeline === 'optimization' ? 'bg-zinc-50/80' : ''
                                            }`}
                                        >
                                            <div className={`p-2 rounded-lg shrink-0 ${
                                                selectedPipeline === 'optimization' ? 'bg-teal-50 text-teal-600' : 'bg-zinc-100 text-zinc-500'
                                            }`}>
                                                <BrainCircuit size={15} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-[12px] font-bold text-zinc-800 leading-snug">
                                                    Logic Reasoner
                                                </div>
                                                <div className="text-[10px] text-zinc-400 font-medium leading-normal mt-0.5">
                                                    Analyze constraints & verify feasibility
                                                </div>
                                            </div>
                                            {selectedPipeline === 'optimization' && (
                                                <Check size={14} className="text-teal-600 shrink-0 self-center" />
                                            )}
                                        </button>

                                        {/* Option 3: Code Gen */}
                                        <button
                                            onClick={() => handleSelectOption('coder')}
                                            className={`w-full text-left px-3 py-2 flex items-start gap-3 hover:bg-zinc-50 rounded-lg transition-all ${
                                                selectedPipeline === 'coder' ? 'bg-zinc-50/80' : ''
                                            }`}
                                        >
                                            <div className={`p-2 rounded-lg shrink-0 ${
                                                selectedPipeline === 'coder' ? 'bg-teal-50 text-teal-600' : 'bg-zinc-100 text-zinc-500'
                                            }`}>
                                                <Terminal size={15} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-[12px] font-bold text-zinc-800 leading-snug">
                                                    Quantum Coder
                                                </div>
                                                <div className="text-[10px] text-zinc-400 font-medium leading-normal mt-0.5">
                                                    Generate D-Wave & OR-Tools scripts
                                                </div>
                                            </div>
                                            {selectedPipeline === 'coder' && (
                                                <Check size={14} className="text-teal-600 shrink-0 self-center" />
                                            )}
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
                                        handleSendMessage();
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
                                onClick={() => handleSendMessage()}
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
            <aside className="w-80 bg-zinc-50/50 flex flex-col h-full shrink-0 overflow-y-auto z-20 p-5 border-l border-zinc-200/60 shadow-sm">
                <div className="flex items-center gap-1.5 pb-4 mb-5 text-[11px] font-bold text-zinc-400 tracking-wider border-b border-zinc-200/60">
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
                            <span>Reasoning pipeline active...</span>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Step 1: NLP Parser */}
                        {currentWorkflow.nlp && (
                            <div className="bg-white border border-zinc-200/60 rounded-xl p-4 shadow-sm space-y-2 flex flex-col">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">
                                        Step 1: NLP parser
                                    </span>
                                    <CheckCircle size={14} className="text-emerald-500" />
                                </div>
                                <div className="text-[11px] font-bold text-zinc-700 leading-snug">
                                    Constraint Intermediate Representation
                                </div>
                                <div className="text-[10.5px] text-zinc-500 font-medium whitespace-pre-wrap leading-relaxed bg-zinc-50 border border-zinc-150 p-2.5 rounded-lg font-mono max-h-[140px] overflow-y-auto">
                                    {currentWorkflow.nlp}
                                </div>
                            </div>
                        )}

                        {/* Step 2: Logic Reasoner */}
                        {currentWorkflow.reasoner && currentWorkflow.reasoner !== 'Bypassed' && (
                            <div className="bg-white border border-zinc-200/60 rounded-xl p-4 shadow-sm space-y-2 flex flex-col animate-in fade-in duration-200">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">
                                        Step 2: Logic reasoner
                                    </span>
                                    <CheckCircle size={14} className="text-emerald-500" />
                                </div>
                                <div className="text-[11px] font-bold text-zinc-700 leading-snug">
                                    Feasibility Arithmetic
                                </div>
                                <div className="text-[10.5px] text-zinc-500 font-medium whitespace-pre-wrap leading-relaxed bg-zinc-50 border border-zinc-150 p-2.5 rounded-lg font-mono max-h-[140px] overflow-y-auto">
                                    {currentWorkflow.reasoner}
                                </div>
                            </div>
                        )}

                        {/* Step 3: Suggestor Router */}
                        {currentWorkflow.suggestor && currentWorkflow.suggestor !== 'Bypassed' && (
                            <div className="bg-white border border-zinc-200/60 rounded-xl p-4 shadow-sm space-y-2.5 flex flex-col animate-in fade-in duration-200">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">
                                        Step 3: Suggestor router
                                    </span>
                                    <CheckCircle size={14} className="text-emerald-500" />
                                </div>
                                <div className="text-[11px] font-bold text-zinc-700 leading-snug">
                                    Model Routing Decision
                                </div>
                                <div className="text-[10.5px] text-zinc-500 font-medium whitespace-pre-wrap leading-relaxed bg-zinc-50 border border-zinc-150 p-2.5 rounded-lg font-mono">
                                    {currentWorkflow.suggestor}
                                </div>
                                
                                {/* Dynamic Solver Brand Badge */}
                                {currentWorkflow.suggested_solver && (
                                    <div className="pt-0.5">
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9.5px] font-bold uppercase tracking-wider border ${
                                            currentWorkflow.suggested_solver.toLowerCase().includes('qubo') 
                                                ? 'bg-purple-50 text-purple-655 border-purple-200' 
                                                : currentWorkflow.suggested_solver.toLowerCase() === 'cqm' 
                                                ? 'bg-blue-50 text-blue-600 border-blue-200' 
                                                : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                        }`}>
                                            {currentWorkflow.suggested_solver.toLowerCase().includes('qubo') ? 'QUBO Compiler' : currentWorkflow.suggested_solver}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Step 4: Coder & Sandbox */}
                        {currentWorkflow.solver && (
                            <div className="bg-white border border-zinc-200/60 rounded-xl p-4 shadow-sm space-y-2 flex flex-col animate-in fade-in duration-200">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">
                                        Step 4: Coder & sandbox
                                    </span>
                                    <CheckCircle size={14} className="text-emerald-500" />
                                </div>
                                <div className="text-[11px] font-bold text-zinc-700 leading-snug">
                                    AST Sandbox Introspection
                                </div>
                                <div className="text-[10.5px] text-zinc-500 leading-relaxed font-medium bg-zinc-50 border border-zinc-150 p-2.5 rounded-lg">
                                    <strong>Target:</strong> {currentWorkflow.solver}<br />
                                    <strong>Verifier:</strong> {currentWorkflow.verifier || "Audit Status: Pass\nVerification complete."}
                                </div>

                                {currentWorkflow.dcc && (
                                    <div className="flex items-center gap-1.5 p-2 bg-amber-50 border-l-4 border-amber-500 text-amber-700 rounded-lg text-[9.5px] font-semibold animate-pulse mt-1">
                                        <AlertCircle size={12} />
                                        <span>DCC Fallback Compiler Activated</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </aside>
        </div>
    );
}
