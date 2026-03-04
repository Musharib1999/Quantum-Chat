"use client";

import React, { useRef, useEffect, useState } from 'react';
import { Send, User, StopCircle, ShieldCheck, Eye, X, ChevronRight, Play, Loader2 } from 'lucide-react';
import MarkdownRenderer from '../MarkdownRenderer';
import QuantumChart from '../QuantumChart';
import { useQuantumChat } from '@/hooks/useQuantumChat';
import { generateQuantumCode, runQuantumSimulator, interpretQuantumResults, savePipelineExperiment } from '@/app/actions/industry-pipeline';
import { useAuth } from '@/context/AuthContext';

interface IndustryChatProps {
    contextConfig?: any;
    placeholder?: string;
    onAnalysisTriggered?: () => void;
}

type WorkflowStage =
    | { kind: 'idle' }
    | { kind: 'step1_loading' }
    | { kind: 'step1_done'; code: string }
    | { kind: 'step2_loading'; code: string }
    | { kind: 'step2_done'; code: string; simOutput: string }
    | { kind: 'step3_loading'; code: string; simOutput: string }
    | { kind: 'step3_done'; code: string; simOutput: string; analysis: string; chartData?: any };

export default function IndustryChat({ contextConfig, placeholder, onAnalysisTriggered }: IndustryChatProps) {
    const { user } = useAuth();
    const {
        messages,
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
    const elapsedTimerRef = useRef<NodeJS.Timeout | null>(null);
    const lastTriggeredFormRef = useRef<string | null>(null);

    // Parse raw output into table if it contains key:value pairs
    const parseOutputTable = (output: string): string => {
        const bestMatch = output.match(/Best(?:\s+solution)?:\s*\{([^}]+)\}/i);
        if (!bestMatch) return output;
        const allPairs = [...bestMatch[1].matchAll(/'?([^':,\s]+)'?\s*:\s*([\w.+-]+)/g)];
        if (allPairs.length === 0) return output;
        const header = `| Variable | Value |\n|---|---|\n`;
        const rows = allPairs.map(([, key, val]) => {
            const pilotFlight = key.match(/pilot[_\s]?(\w+)[_\s]flight[_\s]?(\w+)/i);
            const displayKey = pilotFlight
                ? `Pilot ${pilotFlight[1]} → Flight ${pilotFlight[2]}`
                : key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            const numVal = parseFloat(val);
            const displayVal = isNaN(numVal) ? val : numVal === 1 ? '✅ Assigned' : numVal === 0 ? '⬜ Not Assigned' : numVal.toFixed(4);
            return `| ${displayKey} | ${displayVal} |`;
        });
        const energyMatch = output.match(/Energy:\s*([-\d.]+)/i);
        const energyLine = energyMatch ? `\n\n> **Lowest Energy:** \`${energyMatch[1]}\`` : '';
        return `**⚙️ Simulator Output**\n\n${header}${rows.join('\n')}${energyLine}`;
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

    const runStep1 = async () => {
        setWorkflow({ kind: 'step1_loading' });
        startTimer();
        try {
            const result = await generateQuantumCode({
                problem: contextConfig.problem,
                industry: contextConfig.industry,
                service: contextConfig.service,
                hardware: contextConfig.hardware,
                formData: contextConfig.formData,
            });
            stopTimer();
            setWorkflow({ kind: 'step1_done', code: result.code || result.error || 'No code generated.' });
        } catch (e: any) {
            stopTimer();
            setWorkflow({ kind: 'step1_done', code: `Error: ${e.message}` });
        }
    };

    const runStep2 = async (code: string) => {
        setWorkflow({ kind: 'step2_loading', code });
        startTimer();
        try {
            const result = await runQuantumSimulator({ code, hardware: contextConfig.hardware });
            stopTimer();
            setWorkflow({ kind: 'step2_done', code, simOutput: result.output || result.error || 'No output.' });
        } catch (e: any) {
            stopTimer();
            setWorkflow({ kind: 'step2_done', code, simOutput: `Error: ${e.message}` });
        }
    };

    const runStep3 = async (code: string, simOutput: string) => {
        setWorkflow({ kind: 'step3_loading', code, simOutput });
        startTimer();
        try {
            const result = await interpretQuantumResults({
                problem: contextConfig.problem,
                industry: contextConfig.industry,
                hardware: contextConfig.hardware,
                rawOutput: simOutput,
            });
            stopTimer();
            setWorkflow({ kind: 'step3_done', code, simOutput, analysis: result.text, chartData: result.chartData });

            // Inject final analysis as a bot message
            const tableOutput = parseOutputTable(simOutput);
            const fullMsg = `${tableOutput}\n\n---\n\n${result.text}`;
            addBotMessage(fullMsg, result.chartData);

            // SAVE to DB
            try {
                await savePipelineExperiment({
                    userId: user?.email || 'anonymous',
                    industry: contextConfig.industry || 'Unknown',
                    service: contextConfig.service || 'Unknown',
                    problem: contextConfig.problem || 'Unknown',
                    hardware: contextConfig.hardware || 'Unknown',
                    parameters: contextConfig.formData,
                    qiskitCode: code,
                    results: { output: simOutput },
                    analysis: fullMsg,
                    chartData: result.chartData
                });
            } catch (saveError) {
                console.error("Experiment save failed in UI", saveError);
            }

        } catch (e: any) {
            stopTimer();
            setWorkflow({ kind: 'step3_done', code, simOutput, analysis: `Error: ${e.message}` });
        }
    };

    const isLoading = workflow.kind === 'step1_loading' || workflow.kind === 'step2_loading' || workflow.kind === 'step3_loading';
    const currentStepNum = workflow.kind === 'idle' ? 0 : workflow.kind === 'step1_loading' ? 1 : workflow.kind === 'step1_done' ? 1 : workflow.kind === 'step2_loading' ? 2 : workflow.kind === 'step2_done' ? 2 : 3;

    const steps = [
        { num: 1, label: 'Generate Quantum Code', desc: 'LLM synthesises the circuit / BQM script' },
        { num: 2, label: 'Run Simulator', desc: 'Execute on local quantum backend' },
        { num: 3, label: 'Interpret Results', desc: 'LLM analyses the actual output data' },
    ];

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
                            <div className={`flex max-w-[95%] md:max-w-[85%] lg:max-w-[80%] ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'} items-end gap-2`}>
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${msg.sender === 'user' ? 'bg-secondary border border-border shadow-sm' : 'bg-white border border-border shadow-sm p-1'}`}>
                                    {msg.sender === 'user' ? <User size={14} className="text-foreground" /> : (
                                        <div className="w-full h-full overflow-hidden rounded-lg">
                                            <img src="/qg-icon.png" alt="QG" className="w-full h-full object-contain" />
                                        </div>
                                    )}
                                </div>
                                <div className={`rounded-2xl px-5 py-4 shadow-sm text-base leading-relaxed whitespace-pre-wrap ${msg.sender === 'user' ? 'bg-secondary text-foreground border border-border rounded-br-none' : msg.sender === 'system' ? 'bg-muted text-muted-foreground text-sm text-center w-full rounded-lg border border-border' : 'bg-card text-card-foreground border border-border rounded-bl-none shadow-sm min-w-0 max-w-full overflow-hidden'}`}>
                                    {msg.sender === 'bot' || msg.sender === 'user' ? (
                                        <>
                                            <MarkdownRenderer content={msg.text} />
                                            {msg.chartData && <QuantumChart data={msg.chartData.data} />}
                                        </>
                                    ) : (
                                        <span className="flex items-center justify-center gap-2"><ShieldCheck size={14} />{msg.text}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Step-by-Step Pipeline Card */}
                    {workflow.kind !== 'idle' && workflow.kind !== 'step3_done' && (
                        <div className="flex w-full justify-start animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <div className="bg-card border border-border rounded-2xl p-5 w-full max-w-lg shadow-sm space-y-4">
                                {/* Header */}
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-[10px] text-muted-foreground tracking-wide leading-none mb-0.5">Quantum Pipeline</div>
                                        <div className="text-xs text-foreground">
                                            {contextConfig?.hardware?.includes('D-Wave') || contextConfig?.hardware?.includes('Annealing') ? 'D-Wave Annealing' : 'Gate-Model Circuit'}
                                        </div>
                                    </div>
                                    {isLoading && (
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                                            <span className="text-xs font-mono text-muted-foreground">{elapsedSeconds}s</span>
                                        </div>
                                    )}
                                </div>

                                {/* Steps */}
                                <div className="space-y-3">
                                    {steps.map(step => {
                                        const isDone =
                                            (step.num === 1 && (workflow.kind === 'step1_done' || workflow.kind === 'step2_loading' || workflow.kind === 'step2_done' || workflow.kind === 'step3_loading')) ||
                                            (step.num === 2 && (workflow.kind === 'step2_done' || workflow.kind === 'step3_loading')) ||
                                            (step.num === 3 && workflow.kind === 'step3_loading');
                                        const isActive =
                                            (step.num === 1 && workflow.kind === 'step1_loading') ||
                                            (step.num === 2 && workflow.kind === 'step2_loading') ||
                                            (step.num === 3 && workflow.kind === 'step3_loading');
                                        const isVerifying =
                                            (step.num === 1 && workflow.kind === 'step1_done') ||
                                            (step.num === 2 && workflow.kind === 'step2_done');
                                        const isPending = !isDone && !isActive && !isVerifying;

                                        const stepOutput = step.num === 1 && (workflow as any).code
                                            ? (workflow as any).code
                                            : step.num === 2 && (workflow as any).simOutput
                                                ? (workflow as any).simOutput
                                                : null;

                                        return (
                                            <div key={step.num} className={`transition-all duration-500 ${isPending ? 'opacity-25' : 'opacity-100'}`}>
                                                <div className="flex items-center gap-3">
                                                    {/* Step circle */}
                                                    <div
                                                        className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border text-xs font-bold transition-all
                                                        ${isDone ? 'text-white'
                                                                : isVerifying ? 'border-blue-500 text-blue-500'
                                                                    : isActive ? 'border-primary text-primary'
                                                                        : 'border-border text-muted-foreground'}`}
                                                        style={isDone ? { backgroundColor: '#3066bb', borderColor: '#3066bb' } : {}}
                                                    >
                                                        {isDone ? '✓' : step.num}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-xs text-foreground truncate">{step.label}</div>
                                                        <div className="text-[10px] text-muted-foreground">{step.desc}</div>
                                                    </div>
                                                    {/* Right-side action */}
                                                    {isActive && <Loader2 size={14} className="animate-spin text-primary shrink-0" />}
                                                    {isDone && stepOutput && (
                                                        <button
                                                            onClick={() => setViewingContent({ label: step.label, content: stepOutput })}
                                                            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] text-muted-foreground hover:text-foreground border border-border hover:border-primary/30 hover:bg-secondary transition-all shrink-0"
                                                        >
                                                            <Eye size={10} /> View
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Verify + Continue block — shown after step completes */}
                                                {isVerifying && (
                                                    <div className="mt-3 ml-9 p-3 bg-secondary/50 border border-border rounded-xl space-y-2">
                                                        <div className="text-[10px] text-muted-foreground font-medium">Review the output above before proceeding.</div>
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={() => setViewingContent({ label: step.label, content: stepOutput! })}
                                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-border hover:bg-secondary text-muted-foreground hover:text-foreground transition-all"
                                                            >
                                                                <Eye size={11} /> View Output
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    if (step.num === 1) runStep2((workflow as any).code);
                                                                    if (step.num === 2) runStep3((workflow as any).code, (workflow as any).simOutput);
                                                                }}
                                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-primary text-primary-foreground hover:opacity-90 transition-all font-medium"
                                                            >
                                                                Continue <ChevronRight size={11} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

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
                            className="flex-1 max-h-32 bg-transparent text-foreground placeholder:text-muted-foreground text-base px-4 py-3 focus:outline-none resize-none scrollbar-hide"
                            style={{ minHeight: '52px' }}
                        />
                        <button
                            onClick={() => sendMessage()}
                            disabled={!inputValue.trim() || isTyping}
                            className="p-3 rounded-xl text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md active:scale-95 mb-1 font-bold"
                            style={{ backgroundColor: 'rgb(48, 102, 187)' }}
                        >
                            {isTyping ? <StopCircle size={18} className="animate-pulse" /> : <Send size={18} fill="currentColor" />}
                        </button>
                    </div>
                </div>
            </footer>
        </div>
    );
}
