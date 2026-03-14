"use client";

import React, { useRef, useEffect, useState } from 'react';
import { Send, User, StopCircle, ShieldCheck, Eye, X, ChevronRight, Play, Loader2, Info, Settings, ChevronDown } from 'lucide-react';
import axios from 'axios';
import { Message } from '@/hooks/useQuantumChat';
import MarkdownRenderer from '../MarkdownRenderer';
import QuantumChart from '../QuantumChart';
import { useQuantumChat } from '@/hooks/useQuantumChat';
import { generateQuantumCode, runQuantumSimulator, interpretQuantumResults, savePipelineExperiment, extractBatchState } from '@/app/actions/industry-pipeline';
import { useAuth } from '@/context/AuthContext';

interface IndustryChatProps {
    contextConfig?: any;
    placeholder?: string;
    onAnalysisTriggered?: () => void;
    onPipelineComplete?: () => void;
    blueprint?: any;
}

type WorkflowStage =
    | { kind: 'idle' }
    | { kind: 'step1_loading' }
    | { kind: 'step1_done'; code: string; batchesTotal: number }
    | { kind: 'step2_loading'; code: string; currentBatch: number; totalBatches: number }
    | { kind: 'step2_done'; code: string; simOutput: string; totalBatches: number; totalExecTimeMs: number }
    | { kind: 'step3_loading'; code: string; simOutput: string; totalExecTimeMs: number }
    | { kind: 'step3_done'; code: string; simOutput: string; analysis: string; chartData?: any; totalExecTimeMs: number };

export default function IndustryChat({ contextConfig, placeholder, onAnalysisTriggered, onPipelineComplete, blueprint }: IndustryChatProps) {
    const { user } = useAuth();
    const problem = blueprint?.name || 'Quantum Problem';

// --- In-Chat Sub-Components ---

const InChatForm = ({ message, isReadOnly, onSubmit }: { message: Message, isReadOnly: boolean, onSubmit: (formData: any, qubits: number, batches: number) => void }) => {
    const blueprint = message.workflowData?.blueprint;
    const [formData, setFormData] = useState<Record<string, any>>(message.workflowData?.formData || {});
    const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (isReadOnly && message.workflowData?.formData) {
            setFormData(message.workflowData.formData);
        }
    }, [message.workflowData?.formData, isReadOnly]);

    const calculateComplexity = () => {
        if (!blueprint || !blueprint.qubitFormula) return { qubits: 0, batches: 1 };
        let formula = blueprint.qubitFormula;
        Object.keys(formData).forEach(key => {
            const val = formData[key] === undefined || formData[key] === '' ? 0 : formData[key];
            const regex = new RegExp(`{{${key}}}`, 'g');
            formula = formula.replace(regex, String(val));
        });
        formula = formula.replace(/{{[^}]+}}/g, '0');
        try {
            const sanitized = formula.replace(/[^0-9+\-*/().\s]/g, '');
            const qubits = Math.max(0, Math.ceil(eval(sanitized) || 0));
            let batches = 1;
            if (blueprint.batchingEnabled && blueprint.maxQubitsPerBatch && qubits > blueprint.maxQubitsPerBatch) {
                batches = Math.ceil(qubits / blueprint.maxQubitsPerBatch);
            }
            return { qubits, batches };
        } catch (e) { return { qubits: 0, batches: 1 }; }
    };

    const { qubits, batches } = calculateComplexity();

    const handleInput = (key: string, val: any) => {
        if (isReadOnly) return;
        setFormData(prev => ({ ...prev, [key]: val }));
    };

    if (!blueprint) return null;

    return (
        <div className={`bg-card border border-border rounded-2xl p-4 md:p-6 space-y-6 shadow-sm transition-opacity ${isReadOnly ? 'opacity-90' : 'opacity-100'}`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(blueprint.fields || []).map((field: any) => (
                    <div key={field.key} className="space-y-1.5">
                        <label className="text-sm font-medium text-muted-foreground tracking-tight">{field.label}</label>
                        {field.type === 'select' || field.type === 'dropdown' ? (
                            <select 
                                disabled={isReadOnly}
                                value={formData[field.key] || ''}
                                onChange={(e) => handleInput(field.key, e.target.value)}
                                className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary disabled:opacity-50"
                            >
                                <option value="" disabled>Select...</option>
                                {field.options?.map((opt: any) => (
                                    <option key={typeof opt === 'string' ? opt : opt.value} value={typeof opt === 'string' ? opt : opt.value}>
                                        {typeof opt === 'string' ? opt : opt.label}
                                    </option>
                                ))}
                            </select>
                        ) : field.type === 'multi-select' ? (
                            <div className="flex flex-wrap gap-2 pt-1">
                                {field.options?.map((opt: any) => {
                                    const value = typeof opt === 'string' ? opt : opt.value;
                                    const label = typeof opt === 'string' ? opt : opt.label;
                                    const isSelected = (formData[field.key] || []).includes(value);
                                    
                                    return (
                                        <button
                                            key={value}
                                            disabled={isReadOnly}
                                            onClick={() => {
                                                const current = formData[field.key] || [];
                                                if (isSelected) {
                                                    handleInput(field.key, current.filter((v: any) => v !== value));
                                                } else {
                                                    handleInput(field.key, [...current, value]);
                                                }
                                            }}
                                            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${
                                                isSelected 
                                                ? 'bg-[#3066bb] text-white border-[#3066bb] shadow-sm' 
                                                : 'bg-secondary/40 text-muted-foreground border-border hover:bg-secondary/60'
                                            } disabled:opacity-50`}
                                        >
                                            {label}
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <input 
                                disabled={isReadOnly}
                                type={field.type === 'number' ? 'number' : 'text'}
                                value={formData[field.key] || ''}
                                onChange={(e) => handleInput(field.key, field.type === 'number' ? parseFloat(e.target.value) : e.target.value)}
                                className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary disabled:opacity-50"
                            />
                        )}
                    </div>
                ))}
            </div>
            {!isReadOnly && (
                <button 
                    onClick={() => onSubmit(formData, qubits, batches)}
                    className="w-full bg-[#3066bb] text-white py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-all active:scale-[0.98]"
                >
                    Next <ChevronRight size={14} />
                </button>
            )}
        </div>
    );
};

const InChatReview = ({ message, onExecute }: { message: Message, onExecute: () => void }) => {
    const { formData, qubits, batches, config } = message.workflowData || {};
    const inputEntries = Object.entries(formData || {}).filter(([_, v]) => v !== undefined && v !== '');

    const formatETA = (s: number) => s < 60 ? `~${s}s` : `~${Math.floor(s/60)}m ${s%60}s`;
    
    return (
        <div className="bg-secondary/40 border border-border rounded-2xl p-4 md:p-6 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-4 border-b border-border/50">
                <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-muted-foreground font-medium">Hardware</span>
                    <span className="text-sm font-medium text-foreground">{config?.hardware}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-muted-foreground font-medium">Scale</span>
                    <span className="text-sm font-medium text-foreground">{qubits} Qubits</span>
                </div>
                <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-muted-foreground font-medium">ETA</span>
                    <span className="text-sm font-medium text-foreground">{formatETA(batches! * 25)}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-muted-foreground font-medium">Batches</span>
                    <span className="text-sm font-medium text-foreground">{batches}</span>
                </div>
            </div>

            <div className="space-y-3">
                <span className="text-sm font-medium text-muted-foreground">Parameters</span>
                <div className="flex flex-wrap gap-2">
                    {inputEntries.map(([k, v]) => (
                        <div key={k} className="px-3 py-1.5 rounded-lg bg-card border border-border flex flex-col gap-0.5">
                            <span className="text-xs text-muted-foreground font-medium">{k.replace(/_/g, ' ')}</span>
                            <span className="text-sm font-medium text-foreground">{Array.isArray(v) ? v.join(', ') : String(v)}</span>
                        </div>
                    ))}
                </div>
            </div>

            <button 
                onClick={onExecute}
                className="w-full bg-[#3066bb] text-white py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-[#3066bb]/90 transition-all shadow-xl shadow-[#3066bb]/10"
            >
                <Play size={14} fill="currentColor" /> Execute Simulation
            </button>
        </div>
    );
};

const InChatPipeline = ({ 
    message, 
    workflow, 
    elapsedSeconds, 
    onComplete, 
    onViewContent, 
    onRunStep2, 
    onRunStep3 
}: { 
    message: Message, 
    workflow: any, 
    elapsedSeconds: number, 
    onComplete: (analysis: string, chartData?: any) => void,
    onViewContent: (label: string, content: string) => void,
    onRunStep2: (code: string) => void,
    onRunStep3: (code: string, output: string, time: number) => void
}) => {
    // Only show interactive buttons for the CURRENT active pipeline
    const isCurrent = workflow.kind !== 'idle' && workflow.kind !== 'step3_done';
    
    const steps = [
        { num: 1, label: 'Generate Quantum Code', desc: 'Transforming problem into optimized quantum circuits' },
        { num: 2, label: 'Execute Quantum Job', desc: 'Running on selected quantum simulator or hardware' },
        { num: 3, label: 'Interpret Results', desc: 'Analyzing measurement outputs and explaining outcomes' }
    ];

    return (
        <div className="bg-card border border-border rounded-2xl p-4 md:p-6 space-y-5 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-border/50">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isCurrent ? 'bg-primary animate-pulse' : 'bg-muted'}`} />
                    <span className="text-sm font-semibold text-foreground">Simulation Pipeline</span>
                </div>
                {isCurrent && <span className="text-xs font-mono text-muted-foreground">{elapsedSeconds}s</span>}
            </div>
            <div className="space-y-5">
                {steps.map(step => {
                    const isDone = 
                        (step.num === 1 && ['step1_done', 'step2_loading', 'step2_done', 'step3_loading', 'step3_done'].includes(workflow.kind)) ||
                        (step.num === 2 && ['step2_done', 'step3_loading', 'step3_done'].includes(workflow.kind)) ||
                        (step.num === 3 && ['step3_done'].includes(workflow.kind));
                    const isActive = isCurrent && (
                        (step.num === 1 && workflow.kind === 'step1_loading') ||
                        (step.num === 2 && workflow.kind === 'step2_loading') ||
                        (step.num === 3 && workflow.kind === 'step3_loading')
                    );
                    const isVerifying = isCurrent && (
                        (step.num === 1 && workflow.kind === 'step1_done') ||
                        (step.num === 2 && workflow.kind === 'step2_done')
                    );
                    const isPending = !isDone && !isActive && !isVerifying;

                    const stepOutput = step.num === 1 ? workflow.code : step.num === 2 ? workflow.simOutput : null;
                    
                    return (
                        <div key={step.num} className={`transition-all duration-300 ${isPending ? 'opacity-30' : 'opacity-100'}`}>
                            <div className="flex items-start gap-4">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border shrink-0 transition-all ${isDone ? 'bg-[#3066bb] border-[#3066bb] text-white' : isActive ? 'border-primary text-primary animate-pulse' : 'border-border text-muted-foreground'}`}>
                                    {isDone ? '✓' : step.num}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-foreground leading-snug">{step.label}</div>
                                    <div className="text-xs text-muted-foreground mt-0.5">{step.desc}</div>
                                </div>
                                {isActive && (
                                    <div className="flex items-center gap-2">
                                        {step.num === 2 && (
                                            <span 
                                                className="text-[10px] font-semibold text-white px-2 py-0.5 rounded-full border border-primary/20 shadow-sm"
                                                style={{ backgroundColor: '#3066bb' }}
                                            >
                                                Batch {(workflow as any).currentBatch || 1}/{(workflow as any).totalBatches || 1}
                                            </span>
                                        )}
                                        <Loader2 size={14} className="animate-spin text-primary shrink-0 mt-0.5" />
                                    </div>
                                )}
                                {isDone && stepOutput && !isVerifying && (
                                    <button 
                                        onClick={() => onViewContent(step.label, stepOutput)}
                                        className="bg-[#3066bb] text-white px-3 py-1.5 rounded-lg text-[10px] font-semibold flex items-center gap-1.5 hover:opacity-90 transition-all shadow-sm"
                                    >
                                        <Eye size={12} /> View
                                    </button>
                                )}
                            </div>

                            {/* Verification Block */}
                            {isVerifying && (
                                <div className="mt-3 ml-10 p-3 bg-secondary/50 border border-border rounded-xl space-y-2.5 animate-in slide-in-from-top-2 duration-300">
                                    <div className="text-xs text-muted-foreground font-medium">Review output before final analysis:</div>
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={() => onViewContent(step.label, stepOutput!)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] bg-[#3066bb] text-white hover:opacity-90 transition-all shadow-sm font-semibold"
                                        >
                                            <Eye size={12} /> View Output
                                        </button>
                                        <button 
                                            onClick={() => {
                                                if (step.num === 1) onRunStep2(workflow.code);
                                                if (step.num === 2) onRunStep3(workflow.code, workflow.simOutput, workflow.totalExecTimeMs);
                                            }}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] bg-[#3066bb] text-white hover:opacity-90 transition-all font-semibold"
                                        >
                                            Continue <ChevronRight size={12} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
    const {
        messages,
        setMessages,
        inputValue,
        setInputValue,
        isTyping,
        sendMessage,
        addBotMessage,
        messagesEndRef,
        scrollContainerRef,
        handleScroll,
        setShouldAutoScroll,
    } = useQuantumChat('industry', contextConfig);

    const [workflow, setWorkflow] = useState<WorkflowStage>({ kind: 'idle' });
    const [viewingContent, setViewingContent] = useState<{ label: string; content: string } | null>(null);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [isLocked, setIsLocked] = useState(false);
    const elapsedTimerRef = useRef<NodeJS.Timeout | null>(null);
    const lastTriggeredFormRef = useRef<string | null>(null);

    // Initial Form Message
    useEffect(() => {
        if (messages.length === 0 && contextConfig?.problem) {
            // Check if we already have a form for this problem to avoid dups
            const formKey = `${contextConfig.industry}-${contextConfig.service}-${contextConfig.problem}-${contextConfig.hardware}`;
            if (lastTriggeredFormRef.current === formKey) return;
            lastTriggeredFormRef.current = formKey;

            const fetchInitialForm = async () => {
                try {
                    const { data } = await axios.get(`/api/quantum-forms?industry=${contextConfig.industry}&service=${contextConfig.service}&problem=${contextConfig.problem}&hardware=${contextConfig.hardware}`);
                    
                    const botMsgId = Date.now();
                    setMessages([{
                        id: botMsgId,
                        text: `Please configure the parameters for **${contextConfig.problem}** simulation:`,
                        sender: 'bot',
                        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        workflowType: 'form',
                        workflowData: {
                            blueprint: data,
                            formData: {}, // Default empty or pre-fill
                            config: contextConfig
                        }
                    }]);
                } catch (e) {
                    console.error("Failed to fetch initial form:", e);
                }
            };
            fetchInitialForm();
        }
    }, [contextConfig, messages.length]);

    // Workflow Transitions
    const handleFormTransition = (msg: Message, formData: any, qubits: number, batches: number) => {
        // Update the original form message with the submitted data
        setMessages(prev => prev.map(m => m.id === msg.id ? { 
            ...m, 
            workflowData: { ...m.workflowData, formData } 
        } : m));

        const botMsgId = Date.now();
        setMessages(prev => [...prev, {
            id: botMsgId,
            text: `Please review your simulation settings:`,
            sender: 'bot',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            workflowType: 'review',
            workflowData: {
                formData,
                qubits,
                batches,
                config: contextConfig,
                blueprint: msg.workflowData?.blueprint
            }
        }]);
    };

    const handleReviewTransition = async (msg: Message) => {
        // Trigger Step 1 (Code Generation)
        const botMsgId = Date.now();
        setMessages(prev => [...prev, {
            id: botMsgId,
            text: `Quantum Pipeline initialized for **${msg.workflowData?.config.problem}**:`,
            sender: 'bot',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            workflowType: 'pipeline',
            workflowData: msg.workflowData
        }]);
        
        // Lock UI
        setIsLocked(true);
        
        // Start actual execution
        runStep1(msg.workflowData?.blueprint, msg.workflowData?.formData);
    };

    const handlePipelineComplete = (msg: Message, analysis: string, chartData?: any) => {
        setIsLocked(false);
        // Step 3_done logic handles adding the message usually, 
        // but since we are in-chat, we can just let useQuantumChat's effect handle it 
        // OR manually add the result message here if we want more control.
    };

    // Parse raw output into table if it contains key:value pairs
    const parseOutputTable = (output: string): string => {
        let bestSolution: Record<string, string> = {};
        let lowestEnergy: number | null = null;
        let foundStructured = false;

        // 1. Try Quantum JSON tags (Handles multiple batches too)
        const jsonMatches = [...output.matchAll(/\[QUANTUM_JSON\]([\s\S]*?)\[\/QUANTUM_JSON\]/g)];
        if (jsonMatches.length > 0) {
            jsonMatches.forEach(match => {
                try {
                    const data = JSON.parse(match[1]);
                    if (data.best_solution) {
                        foundStructured = true;
                        Object.entries(data.best_solution).forEach(([k, v]) => {
                            bestSolution[k] = String(v);
                        });
                    }
                    if (data.energy !== undefined) {
                        lowestEnergy = lowestEnergy === null ? data.energy : Math.min(lowestEnergy, data.energy);
                    }
                } catch (e) {
                    console.warn("Table parse error:", e);
                }
            });
        }

        // 2. Fallback to legacy plain-text regex
        if (!foundStructured) {
            const bestMatch = output.match(/Best(?:\s+solution)?:\s*\{([^}]+)\}/i);
            if (!bestMatch) return output;
            const pairs = [...bestMatch[1].matchAll(/["']?([^"':,\s]+)["']?\s*:\s*([\w.+-]+)/g)];
            pairs.forEach(([, k, v]) => {
                bestSolution[k] = v;
            });
            const energyMatch = output.match(/Energy:\s*([-\d.]+)/i);
            if (energyMatch) {
                lowestEnergy = parseFloat(energyMatch[1]);
            }
        }

        const allKeys = Object.keys(bestSolution);
        if (allKeys.length === 0) return output;

        const pilotGroupings: Record<string, { day: string, route: string }[]> = {};
        const otherAssigned: string[] = [];
        let hasGroupedData = false;

        allKeys.forEach(rawKey => {
            const val = parseFloat(bestSolution[rawKey]);
            const key = rawKey.replace(/["']/g, ''); // Clean quotes

            if (val === 1) {
                // Check for x_pilot_route_day or x_pilot_route
                const xMatch = key.match(/x_(\w+)_(\w+)(?:_(\w+))?/i);
                const pilotFlight = key.match(/pilot[_\s]?(\w+)[_\s]flight[_\s]?(\w+)/i);

                if (xMatch) {
                    const [, p, r, d] = xMatch;
                    if (!pilotGroupings[p]) pilotGroupings[p] = [];
                    pilotGroupings[p].push({ day: d !== undefined ? d : 'N/A', route: r });
                    hasGroupedData = true;
                } else if (pilotFlight) {
                    const [, p, r] = pilotFlight;
                    if (!pilotGroupings[p]) pilotGroupings[p] = [];
                    pilotGroupings[p].push({ day: 'N/A', route: r });
                    hasGroupedData = true;
                } else {
                    let displayKey = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                    otherAssigned.push(displayKey);
                }
            }
        });

        let outputStr = '';

        if (hasGroupedData) {
            const sortedPilots = Object.keys(pilotGroupings).sort((a, b) => parseInt(a) - parseInt(b));
            sortedPilots.forEach(p => {
                outputStr += `**Pilot ${p}**\n`;
                const assignments = pilotGroupings[p].sort((a, b) => {
                    if (a.day === 'N/A' || b.day === 'N/A') return 0;
                    return parseInt(a.day) - parseInt(b.day);
                });
                assignments.forEach(a => {
                    const dayStr = a.day !== 'N/A' ? `Day ${a.day}` : 'Assignment';
                    outputStr += `- ${dayStr}: Route ${a.route}\n`;
                });
                outputStr += '\n'; // Add spacing between pilots
            });

            if (otherAssigned.length > 0) {
                outputStr += `**Other Assignments**\n` + otherAssigned.map(k => `- ${k}\n`).join('');
            }
            outputStr = outputStr.trim();
        } else {
            // Fallback to standard table if no pilot groupings found
            const header = `| Variable | Value |\n|---|---|\n`;
            const rows = allKeys.map(rawKey => {
                const val = bestSolution[rawKey];
                const key = rawKey.replace(/["']/g, '');

                const xMatch = key.match(/x_(\w+)_(\w+)(?:_(\w+))?/i);
                const pilotFlight = key.match(/pilot[_\s]?(\w+)[_\s]flight[_\s]?(\w+)/i);

                let displayKey = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

                if (xMatch) {
                    const [, p, r, d] = xMatch;
                    displayKey = `Pilot ${p} → Flight ${r}`;
                    if (d !== undefined) displayKey += ` (Day ${d})`;
                } else if (pilotFlight) {
                    displayKey = `Pilot ${pilotFlight[1]} → Flight ${pilotFlight[2]}`;
                }

                const numVal = parseFloat(val);
                const displayVal = isNaN(numVal) ? val : numVal === 1 ? '✅ Assigned' : numVal === 0 ? '⬜ Not Assigned' : numVal.toFixed(4);
                return `| ${displayKey} | ${displayVal} |`;
            });
            outputStr = `${header}${rows.join('\n')}`;
        }

        const energyLine = lowestEnergy !== null ? `\n\n> **Lowest Energy:** \`${lowestEnergy.toFixed(4)}\`` : '';
        return `**⚙️ Simulator Output**\n\n${outputStr}${energyLine}`;
    };

    // Start timer
    const startTimer = () => {
        setElapsedSeconds(0);
        if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
        elapsedTimerRef.current = setInterval(() => setElapsedSeconds(s => s + 1), 1000);
    };
    const stopTimer = () => {
        if (elapsedTimerRef.current) { clearInterval(elapsedTimerRef.current); elapsedTimerRef.current = null; }
    };

    // Trigger workflow when form submitted
    useEffect(() => {
        if (contextConfig?.formData) {
            const formString = JSON.stringify(contextConfig.formData);
            if (formString !== lastTriggeredFormRef.current) {
                lastTriggeredFormRef.current = formString;
                setShouldAutoScroll(true);
                runStep1();
            }
        }
    }, [contextConfig]);


    const runStep1 = async (overriddenBlueprint?: any, overriddenFormData?: any) => {
        const bp = overriddenBlueprint || blueprint;
        const fd = overriddenFormData || contextConfig.formData || {};
        
        setWorkflow({ kind: 'step1_loading', formData: fd } as any);
        startTimer();
        try {
            const result = await generateQuantumCode({
                problem: bp?.name || contextConfig.problem,
                industry: bp?.industry || contextConfig.industry,
                service: bp?.service || contextConfig.service,
                hardware: bp?.hardware || contextConfig.hardware,
                formData: fd,
                batchIndex: 1, // Start with first batch
            });

            // Check if user has enough sim minutes left
            const limit = user?.simMinutesLimit ?? 5;
            const used = user?.simMinutesUsed ?? 0;
            const guestUsed = !user ? parseFloat(sessionStorage.getItem('qg_session_sim_minutes_used') || '0') : 0;
            const totalUsed = user ? used : guestUsed;

            if (totalUsed >= limit) {
                stopTimer();
                setWorkflow({ kind: 'step1_done', code: 'Error: Simulation minutes exhausted. Please contact admin to reset your quota.', batchesTotal: 1 });
                addBotMessage('⚠️ **Simulation Blocked**: You have reached your allocated simulation minute limit. Please contact an administrator to increase your quota.');
                return;
            }

            stopTimer();
            setWorkflow({
                kind: 'step1_done',
                code: result.code || result.error || 'No code generated.',
                batchesTotal: result.batchesTotal || 1,
                formData: fd
            } as any);
        } catch (e: any) {
            stopTimer();
            setWorkflow({ kind: 'step1_done', code: `Error: ${e.message}`, batchesTotal: 1 });
        }
    };

    const runStep2 = async (initialCode: string, overriddenBlueprint?: any, overriddenFormData?: any) => {
        const bp = overriddenBlueprint || blueprint;
        const fd = overriddenFormData || (workflow as any).formData || contextConfig.formData || {};
        const totalBatches = (workflow as any).batchesTotal || 1;
        let combinedOutput = "";
        let currentBatchCode = initialCode;
        let lastBatchState = "None";
        let totalExecTimeMs = 0;

        // Final check before starting long run
        const limit = user?.simMinutesLimit ?? 5;
        const used = user?.simMinutesUsed ?? 0;
        const guestUsed = !user ? parseFloat(sessionStorage.getItem('qg_session_sim_minutes_used') || '0') : 0;
        if ((user ? used : guestUsed) >= limit) {
            addBotMessage('⚠️ **Simulation Blocked**: Simulation minute limit reached.');
            return;
        }

        setWorkflow({ kind: 'step2_loading', code: initialCode, currentBatch: 1, totalBatches });
        startTimer();

        try {
            for (let b = 1; b <= totalBatches; b++) {
                console.log(`[IndustryChat] Starting Batch ${b}/${totalBatches}`);
                setWorkflow(prev => ({ ...prev, kind: 'step2_loading', currentBatch: b } as any));

                // Safety Fuse: If a single batch takes > 90s, force fail
                const batchTimeout = setTimeout(() => {
                    console.error(`[IndustryChat] Safety Fuse Tripped at Batch ${b}`);
                    // We can't easily "cancel" the async call, but we can stop the loop
                }, 90000);

                try {
                    // 1. Generate code for current batch if not the first one (first was done in Step 1)
                    if (b > 1) {
                        console.log(`[IndustryChat] Generating code for batch ${b}...`);
                        const genRes = await generateQuantumCode({
                            problem: bp?.name || contextConfig.problem,
                            industry: bp?.industry || contextConfig.industry,
                            service: bp?.service || contextConfig.service,
                            hardware: bp?.hardware || contextConfig.hardware,
                            formData: fd,
                            batchIndex: b,
                            lastBatchState
                        });
                        currentBatchCode = genRes.code;
                    }

                    // 2. Run Simulator
                    console.log(`[IndustryChat] Calling Simulator for batch ${b}...`);
                    const simRes = await runQuantumSimulator({
                        code: currentBatchCode,
                        hardware: contextConfig.hardware
                    });

                    clearTimeout(batchTimeout);

                    if (simRes.error) {
                        console.error(`[IndustryChat] Simulator error in batch ${b}:`, simRes.error);
                        throw new Error(`Batch ${b} Failed: ${simRes.error}`);
                    }

                    console.log(`[IndustryChat] Batch ${b} completed successfuilly.`);
                    combinedOutput += `\n\n--- BATCH ${b} ---\n${simRes.output}`;
                    if (simRes.executionTimeMs) totalExecTimeMs += simRes.executionTimeMs;

                    // 3. Extract state for next batch if needed
                    if (b < totalBatches) {
                        console.log(`[IndustryChat] Extracting state from batch ${b}...`);
                        const stateRes = await extractBatchState({ output: simRes.output });
                        lastBatchState = stateRes.state;
                    }
                } catch (err) {
                    clearTimeout(batchTimeout);
                    throw err;
                }
            }

            stopTimer();
            setWorkflow(prev => ({
                ...prev,
                kind: 'step2_done',
                code: initialCode,
                simOutput: combinedOutput.trim(),
                totalBatches,
                totalExecTimeMs,
                formData: fd
            } as any));
        } catch (e: any) {
            stopTimer();
            setWorkflow({ kind: 'step2_done', code: initialCode, simOutput: `Error: ${e.message}`, totalBatches, totalExecTimeMs: 0 });
        }
    };

    const runStep3 = async (
        initialCode: string, 
        simOutput: string, 
        totalExecutionTimeMs: number,
        overriddenBlueprint?: any,
        overriddenFormData?: any
    ) => {
        const bp = overriddenBlueprint || blueprint;
        const fd = overriddenFormData || (workflow as any).formData || contextConfig.formData || {};
        
        setWorkflow({ kind: 'step3_loading', code: initialCode, simOutput, totalExecTimeMs: totalExecutionTimeMs } as any);
        startTimer();
        try {
            const result = await interpretQuantumResults({
                problem: bp?.name || contextConfig.problem,
                industry: bp?.industry || contextConfig.industry,
                service: bp?.service || contextConfig.service,
                hardware: bp?.hardware || contextConfig.hardware,
                formData: fd,
                rawOutput: simOutput,
            });
            stopTimer();
            setWorkflow({ kind: 'step3_done', code: initialCode, simOutput, analysis: result.text, chartData: result.chartData, totalExecTimeMs: totalExecutionTimeMs });
            onPipelineComplete?.();

            // Sim minutes update
            const simSeconds = totalExecutionTimeMs / 1000;
            let simMinutesDelta = Math.ceil((simSeconds / 60) * 2) / 2;
            if (simMinutesDelta < 0.5 && simMinutesDelta > 0) simMinutesDelta = 0.5;
            window.dispatchEvent(new CustomEvent('qg:simminutes-update', { detail: { delta: simMinutesDelta } }));

            // Add results to chat
            let tableHtml = "";
            if (result.assignmentsTable && result.assignmentsTable.length > 0) {
                // Construct standard Markdown table with Problem Details
                const hardware = contextConfig?.hardware || 'Quantum Annealer';

                // Use the actual qubit count returned by the backend (same 'n' as in the Quantum Exploration message)
                let qubitCount = result.qubitCount || 0;

                // Fallback for aviation (form-based) if backend didn't report it
                if (!qubitCount && contextConfig.industry?.toLowerCase() === 'aviation') {
                    const pilots = contextConfig?.formData?.number_of_pilots || 0;
                    const days = contextConfig?.formData?.days || 0;
                    qubitCount = pilots * days;
                }

                const isFinance = contextConfig.industry?.toLowerCase() === 'finance';
                tableHtml = `### Solution Details\n\n`;
                tableHtml += `| Metric | Configuration |\n`;
                tableHtml += `|:---|:---|\n`;
                tableHtml += `| **Problem** | ${contextConfig?.problem || 'Quantum Solution'} |\n`;
                tableHtml += `| **Hardware** | \`${hardware}\` |\n`;

                if (isFinance && contextConfig?.formData?.sector) {
                    const sectors = Array.isArray(contextConfig.formData.sector)
                        ? contextConfig.formData.sector.join(', ')
                        : contextConfig.formData.sector;
                    tableHtml += `| **Universe** | ${sectors} |\n`;
                }
                tableHtml += `\n`;

                // --- DYNAMIC TABLE HEADERS ---
                // If the blueprint or result has outputTables, use the first one's mapping
                const tableConfig = result.outputTables?.[0] || blueprint?.outputTables?.[0];
                
                if (tableConfig && tableConfig.mapping && tableConfig.mapping.length > 0) {
                    const sortedMapping = [...tableConfig.mapping].sort((a, b) => (a.priority || 0) - (b.priority || 0));
                    
                    // Headers
                    tableHtml += `| ${sortedMapping.map(m => m.label).join(' | ')} |\n`;
                    tableHtml += `| ${sortedMapping.map(() => ':---').join(' | ')} |\n`;

                    // Rows
                    result.assignmentsTable.forEach((row: any) => {
                        const rowVals = sortedMapping.map(col => {
                            const val = row[col.resultKey];
                            if (val === undefined || val === null) return '-';
                            if (col.type === 'percentage') return `${typeof val === 'number' ? val.toFixed(2) : val}%`;
                            if (col.type === 'number' && typeof val === 'number') return val.toLocaleString();
                            if (col.type === 'boolean') return val ? '✅' : '❌';
                            return `**${val}**`;
                        });
                        tableHtml += `| ${rowVals.join(' | ')} |\n`;
                    });
                } else {
                    // Fallback to old hardcoded logic if no mapping exists
                    const h1 = isFinance ? 'Status' : 'Period';
                    const h2 = isFinance ? 'Ticker' : 'Resource';
                    const h3 = isFinance ? 'Assignment' : 'Value';

                    tableHtml += `| ${h1} | ${h2} | ${h3} |\n`;
                    tableHtml += `|:---|:---|:---|\n`;

                    result.assignmentsTable.forEach((row: any) => {
                        const label = row.sector || row.day || 'Selected';
                        const displayLabel = label.toString().startsWith('Day') ? label : `**${label}**`;
                        tableHtml += `| ${displayLabel} | **${row.pilot || row.ticker || '-'}** | ${row.route || row.assignment || '-'} |\n`;
                    });
                }
            }

            // Auto-generate chart if missing
            let finalChartData = result.chartData;
            if (!finalChartData && result.assignmentsTable && result.assignmentsTable.length > 0) {
                const candidateKeys = ['energy', 'return', 'risk', 'value', 'weight'];
                let yKey = '';
                const firstRow = result.assignmentsTable[0];
                for (const key of candidateKeys) {
                    if (firstRow[key] !== undefined) {
                        const val = firstRow[key];
                        if (typeof val === 'number' || (typeof val === 'string' && val.match(/-?\d+\.?\d*/))) {
                            yKey = key;
                            break;
                        }
                    }
                }
                if (yKey) {
                    const chartPoints = result.assignmentsTable.slice(0, 15).map((row: any) => {
                        let val = row[yKey];
                        if (typeof val === 'string') {
                            const match = val.match(/-?\d+\.?\d*/);
                            val = match ? parseFloat(match[0]) : 0;
                        }
                        return {
                            name: row.pose || row.ticker || row.asset || row.variable || row.label || 'Item',
                            value: val
                        };
                    });
                    finalChartData = { data: chartPoints };
                }
            }

            // Inject final analysis as a bot message
            const fullMsg = result.portfolioMetrics ? result.text : `${tableHtml}\n\n${result.text}`;
            addBotMessage(fullMsg, finalChartData, result.portfolioMetrics, result.assignmentsTable, result.outputTables);

            // SAVE to DB
            try {
                await savePipelineExperiment({
                    userId: user?.email || 'anonymous',
                    industry: contextConfig.industry || 'Unknown',
                    service: contextConfig.service || 'Unknown',
                    problem: contextConfig.problem || 'Unknown',
                    hardware: contextConfig.hardware || 'Unknown',
                    parameters: fd,
                    qiskitCode: initialCode,
                    results: { output: simOutput },
                    analysis: fullMsg,
                    chartData: finalChartData,
                    assignmentsTable: result.assignmentsTable,
                    portfolioMetrics: result.portfolioMetrics,
                    outputTables: result.outputTables || []
                });
            } catch (saveError) {
                console.error("Experiment save failed in UI", saveError);
            }

        } catch (e: any) {
            stopTimer();
            setWorkflow({ kind: 'step3_done', code: initialCode, simOutput, analysis: `Error: ${e.message}`, totalExecTimeMs: totalExecutionTimeMs });
            onPipelineComplete?.();

        }
    };

    const isLoading = workflow.kind === 'step1_loading' || workflow.kind === 'step2_loading' || workflow.kind === 'step3_loading';
    const currentStepNum = workflow.kind === 'idle' ? 0 : workflow.kind === 'step1_loading' ? 1 : workflow.kind === 'step1_done' ? 1 : workflow.kind === 'step2_loading' ? 2 : workflow.kind === 'step2_done' ? 2 : 3;
    
    const renderDynamicTables = (assignments: any[], portfolioMetrics?: any, tables?: any[]) => {
        let activeTables = tables || blueprint?.outputTables;

        // BREADCRUMB: Zero-Code Table Synthesizer
        // If no table mapping exists, automatically synthesize one from the result keys
        if ((!activeTables || activeTables.length === 0) && assignments && assignments.length > 0) {
            const firstRow = assignments[0];
            const autoMapping = Object.keys(firstRow)
                .filter(key => key !== 'id' && key !== 'combinatorialSize')
                .map((key, idx) => ({
                    label: key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
                    resultKey: key,
                    type: typeof firstRow[key] === 'number' ? 'number' : 'text',
                    priority: idx
                }));
            
            activeTables = [{
                name: 'Generated Simulation Results',
                mapping: autoMapping
            }];
        }

        if (!activeTables || activeTables.length === 0) return null;

        return (
            <div className="space-y-6 my-4 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                {activeTables.map((table: any, tIdx: number) => {
                    // Decide if this table is for "Summary" (global metrics) or "Details" (list data)
                    const isSummaryTable = table.mapping.some((col: any) => {
                        const key = col.resultKey?.trim();
                        return portfolioMetrics && portfolioMetrics[key] !== undefined && portfolioMetrics[key] !== null;
                    });
                    
                    const rowsData = isSummaryTable ? [portfolioMetrics] : assignments;

                    return (
                        <div key={tIdx} className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                            <div className="px-4 py-2 border-b border-border bg-secondary/30">
                                <h4 className="text-[10px] font-bold text-muted-foreground tracking-wider">{table.name}</h4>
                            </div>
                            <div className="max-h-[300px] overflow-y-auto overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead className="sticky top-0 bg-muted/95 backdrop-blur-md z-10 border-b border-border">
                                        <tr>
                                            {(() => {
                                                const mapping = [...table.mapping];
                                                if (tIdx === 0 && !mapping.some(m => m.resultKey === 'combinatorialSize')) {
                                                    mapping.push({ label: 'Combinatorial Size', resultKey: 'combinatorialSize', type: 'text', priority: 100 });
                                                }
                                                return mapping.sort((a: any, b: any) => (a.priority || 0) - (b.priority || 0)).map((col: any, cIdx: number) => (
                                                    <th key={cIdx} className="px-3 py-3 text-[10px] text-[#111827] font-normal tracking-widest bg-secondary/5">{col.label}</th>
                                                ));
                                            })()}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {rowsData.map((row: any, rIdx: number) => (
                                            <tr key={rIdx} className="hover:bg-muted/40 transition-colors">
                                                {(() => {
                                                    const mapping = [...table.mapping];
                                                    if (tIdx === 0 && !mapping.some(m => m.resultKey === 'combinatorialSize')) {
                                                        mapping.push({ label: 'Combinatorial Size', resultKey: 'combinatorialSize', type: 'text', priority: 100 });
                                                    }
                                                    return mapping.sort((a: any, b: any) => (a.priority || 0) - (b.priority || 0)).map((col: any, cIdx: number) => {
                                                        const val = row ? row[col.resultKey] : undefined;
                                                        const displayVal = col.type === 'percentage' 
                                                            ? (typeof val === 'number' ? `${val.toFixed(2)}%` : val)
                                                            : col.type === 'number'
                                                                ? (typeof val === 'number' ? val.toLocaleString() : val)
                                                                : val;
                                                        
                                                        const colorClass = col.type === 'percentage' && typeof val === 'number' 
                                                            ? (val > 0 ? 'text-[#10b981]' : val < 0 ? 'text-[#ef4444]' : 'text-[#111827]')
                                                            : 'text-[#111827]';

                                                        return (
                                                            <td key={cIdx} className={`px-3 py-3 text-sm ${colorClass}`}>
                                                                {displayVal || (rIdx === 0 && isSummaryTable ? '0' : '-')}
                                                            </td>
                                                        );
                                                    });
                                                })()}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    const steps = [
        { num: 1, label: 'Generate Quantum Code', desc: 'Quantum Guru AI transforms the problem into optimized quantum circuits or BQM models' },
        { num: 2, label: 'Execute Quantum Job', desc: 'Execute the program on the selected quantum simulator or hardware' },
        { num: 3, label: 'Interpret Results', desc: 'Quantum Guru AI analyzes measurement outputs and explains the solution in human terms' }
    ];
    const PortfolioResultsSideBySide = ({ metrics, assignments, qubitCount }: { metrics: any, assignments: any[], qubitCount: number }) => {
        const toSuperscript = (num: number) => {
            const map: { [key: string]: string } = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
            return num.toString().split('').map(c => map[c] || c).join('');
        };

        const getQuantumStateSpaceName = (n: number) => {
            if (n < 20) return "Thousands";
            if (n < 30) return "Millions";
            if (n < 40) return "Billions";
            if (n < 50) return "Trillions";
            if (n < 60) return "Quadrillions";
            if (n < 70) return "Quintillions";
            if (n < 80) return "Sextillions";
            if (n < 90) return "Septillions";
            if (n < 100) return "Octillions";
            return "Nonillions+";
        };

        return (
            <div className="grid grid-cols-1 xl:grid-cols-8 gap-4 my-6">
                {/* 1. Summary Table */}
                <div className="xl:col-span-3 bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                        <tbody className="divide-y divide-border">
                            <tr>
                                <td className="pl-2 pr-1.5 py-3 text-xs text-[#111827] bg-secondary/10 tracking-tight">Sectors</td>
                                <td className="px-1.5 py-3 text-sm text-[#111827]">{metrics.sectorsCount}</td>
                            </tr>
                            <tr>
                                <td className="pl-2 pr-1.5 py-3 text-xs text-[#111827] bg-secondary/10 tracking-tight">Assets</td>
                                <td className="px-1.5 py-3 text-sm text-[#111827]">{metrics.assetsCount}</td>
                            </tr>
                            <tr>
                                <td className="pl-2 pr-1.5 py-3 text-xs text-[#111827] bg-secondary/10 tracking-tight">Stocks</td>
                                <td className="px-1.5 py-3 text-sm text-[#111827]">{metrics.universeSize}</td>
                            </tr>
                            <tr>
                                <td className="pl-2 pr-1.5 py-3 text-xs text-[#111827] bg-secondary/10 tracking-tight">Avg Return</td>
                                <td className="px-1.5 py-3 text-sm text-[#10b981]">{metrics.avgReturn.toFixed(2)}%</td>
                            </tr>
                            <tr>
                                <td className="pl-2 pr-1.5 py-3 text-xs text-[#111827] bg-secondary/10 tracking-tight">Avg Risk</td>
                                <td className="px-1.5 py-3 text-sm text-[#ef4444]">{metrics.avgRisk.toFixed(2)}%</td>
                            </tr>
                            <tr>
                                <td className="pl-2 pr-1.5 py-3 text-xs text-[#111827] bg-secondary/10 tracking-tight">Portfolio States</td>
                                <td className="px-1.5 py-3 text-sm text-[#111827]">2{toSuperscript(qubitCount)}</td>
                            </tr>
                            <tr>
                                <td className="pl-2 pr-1.5 py-3 text-xs text-[#111827] bg-secondary/10 tracking-tight">Combinatorial Scale</td>
                                <td className="px-1.5 py-3 text-sm text-[#111827]">{getQuantumStateSpaceName(qubitCount)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* 2. Detailed Table */}
                <div className="xl:col-span-5 bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                    <div className="max-h-[380px] overflow-y-auto overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 bg-muted/95 backdrop-blur-md z-10 border-b border-border">
                                <tr>
                                    <th className="pl-2 pr-1.5 py-3 text-[10px] text-[#111827] font-normal tracking-widest bg-secondary/5">Asset</th>
                                    <th className="px-1.5 py-3 text-[10px] text-[#111827] font-normal tracking-widest bg-secondary/5">Sector</th>
                                    <th className="px-1.5 py-3 text-[10px] text-[#111827] font-normal tracking-widest bg-secondary/5">Ticker</th>
                                    <th className="px-1.5 py-3 text-[10px] text-[#111827] font-normal tracking-widest bg-secondary/5">Return</th>
                                    <th className="px-1.5 py-3 text-[10px] text-[#111827] font-normal tracking-widest bg-secondary/5">Risk</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {assignments.map((row: any, idx: number) => (
                                    <tr key={idx} className="hover:bg-muted/40 transition-colors group">
                                        <td className="pl-2 pr-1.5 py-3 text-sm text-[#111827] leading-relaxed">{row.route?.split('(')[0].trim()}</td>
                                        <td className="px-1.5 py-3 text-sm text-[#111827] tracking-tight">{row.sector}</td>
                                        <td className="px-1.5 py-3 text-sm text-[#111827]">{row.ticker || row.pilot || row.asset || 'N/A'}</td>
                                        <td className="px-1.5 py-3 text-sm text-[#10b981]">{row.return !== undefined ? `${row.return.toFixed(2)}%` : '-'}</td>
                                        <td className="px-1.5 py-3 text-sm text-[#ef4444]">{row.risk !== undefined ? `${row.risk.toFixed(2)}%` : '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full w-full overflow-hidden">

            {/* View Content Modal */}
            {viewingContent && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-4 border-b border-border flex items-center justify-between bg-secondary/50 rounded-t-2xl">
                            <div className="flex items-center gap-2">
                                <Eye size={16} className="text-primary" />
                                <span className="text-sm font-medium text-foreground">{viewingContent.label}</span>
                            </div>
                            <button onClick={() => setViewingContent(null)} className="p-1 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-colors">
                                <X size={16} />
                            </button>
                        </div>
                        <div className="overflow-y-auto flex-1 p-4">
                            <pre className="bg-muted rounded-xl p-4 text-xs font-mono text-foreground whitespace-pre-wrap break-all leading-relaxed">{viewingContent.content}</pre>
                        </div>
                    </div>
                    <div className="absolute inset-0 -z-10" onClick={() => setViewingContent(null)} />
                </div>
            )}

            {/* Messages List */}
            <main
                ref={scrollContainerRef as any}
                onScroll={handleScroll}
                className={`overflow-y-auto bg-transparent min-w-0 w-full overflow-x-hidden transition-all duration-700 ease-in-out ${messages.length === 0 && workflow.kind === 'idle' ? 'flex-[0.001] opacity-0 py-0' : 'flex-1 p-3 md:p-4 lg:p-6 opacity-100'}`}
            >
                <div className="w-full max-w-3xl mx-auto space-y-6">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex w-full ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`flex max-w-[95%] md:max-w-[90%] lg:max-w-[90%] ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'} items-end gap-2`}>
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${msg.sender === 'user' ? 'bg-secondary border border-border shadow-sm' : 'bg-white border border-border shadow-sm p-1'}`}>
                                    {msg.sender === 'user' ? <User size={14} className="text-foreground" /> : (
                                        <div className="w-full h-full overflow-hidden rounded-lg">
                                            <img src="/qg-icon.png" alt="QG" className="w-full h-full object-contain" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0 flex flex-col gap-3">
                                    {(msg.portfolioMetrics || (msg.outputTables && msg.outputTables.length > 0)) ? (
                                        <div className="w-full overflow-hidden">
                                            {renderDynamicTables(msg.assignmentsTable || [], msg.portfolioMetrics, msg.outputTables)}
                                        </div>
                                    ) : null}
                                    <div className={`rounded-2xl px-5 py-4 shadow-sm text-base leading-relaxed whitespace-pre-wrap ${msg.sender === 'user' ? 'bg-secondary text-foreground border border-border rounded-br-none self-end' : msg.sender === 'system' ? 'bg-muted text-muted-foreground text-sm text-center w-full rounded-lg border border-border' : 'bg-card text-card-foreground border border-border rounded-bl-none shadow-sm min-w-0 max-w-full overflow-hidden self-start'}`}>
                                        {msg.sender === 'bot' || msg.sender === 'user' ? (
                                            <>
                                                <MarkdownRenderer content={msg.text} />
                                    
                                    {/* Workflow Messages */}
                                    {msg.workflowType === 'form' && (
                                        <div className="mt-4">
                                            <InChatForm 
                                                message={msg}
                                                isReadOnly={messages[messages.length-1].id !== msg.id}
                                                onSubmit={(formData, qubits, batches) => handleFormTransition(msg, formData, qubits, batches)}
                                            />
                                        </div>
                                    )}

                                    {msg.workflowType === 'review' && (
                                        <div className="mt-4">
                                            <InChatReview 
                                                message={msg}
                                                onExecute={() => handleReviewTransition(msg)}
                                            />
                                        </div>
                                    )}

                                    {msg.workflowType === 'pipeline' && (
                                        <div className="mt-4">
                                            <InChatPipeline 
                                                message={msg}
                                                workflow={workflow}
                                                elapsedSeconds={elapsedSeconds}
                                                onComplete={(analysis, chartData) => handlePipelineComplete(msg, analysis, chartData)}
                                                onViewContent={(label, content) => setViewingContent({ label, content })}
                                                onRunStep2={runStep2}
                                                onRunStep3={runStep3}
                                            />
                                        </div>
                                    )}
                                                {msg.chartData && <QuantumChart data={msg.chartData.data} />}
                                            </>
                                        ) : (
                                            <span className="flex items-center justify-center gap-2"><ShieldCheck size={14} />{msg.text}</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}


                    <div ref={messagesEndRef} />
                </div>
            </main>

            {/* Input Area */}
            <footer className={`p-4 md:p-6 bg-transparent relative z-20 transition-all duration-700 ease-in-out ${messages.length === 0 && workflow.kind === 'idle' ? 'flex-1 flex flex-col justify-center' : 'translate-y-0'}`}>
                <div className="max-w-3xl mx-auto w-full relative group">
                    {messages.length === 0 && workflow.kind === 'idle' && (
                        <div className="mb-12 text-center animate-in fade-in zoom-in slide-in-from-bottom-4 duration-1000">
                            <div className="mx-auto mb-8 group-hover:scale-105 transition-transform duration-500 flex justify-center">
                                <img src="/qg-icon.png" alt="Quantum Guru" className="h-[90px] w-auto object-contain" />
                            </div>
                            <p className="text-muted-foreground text-lg font-light max-w-lg mx-auto leading-relaxed">
                                Industrial Quantum Solutions & Architecture Design.
                            </p>
                        </div>
                    )}
                    <div className="relative flex items-end gap-2 bg-card/80 backdrop-blur-xl border border-border rounded-2xl shadow-lg p-2 transition-all focus-within:ring-1 focus-within:ring-ring focus-within:border-ring focus-within:bg-card">
                        <textarea
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                            placeholder={placeholder || "Ask QUANTUM GURU AI..."}
                            rows={1}
                            disabled={isLocked}
                            className="flex-1 max-h-32 bg-transparent text-foreground placeholder:text-muted-foreground text-base px-4 py-3 focus:outline-none resize-none scrollbar-hide disabled:opacity-50"
                            style={{ minHeight: '52px' }}
                        />
                        <button
                            onClick={() => sendMessage()}
                            disabled={isLocked || !inputValue.trim() || isTyping}
                            className="p-3 rounded-xl text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md active:scale-95 mb-1 font-semibold"
                            style={{ backgroundColor: 'rgb(48, 102, 187)' }}
                        >
                            {isLocked ? <Loader2 size={18} className="animate-spin" /> : isTyping ? <StopCircle size={18} className="animate-pulse" /> : <Send size={18} fill="currentColor" />}
                        </button>
                    </div>
                </div>
            </footer>
        </div>
    );
}
