"use client";

import React, { useRef, useEffect, useState } from 'react';
import { Send, User, StopCircle, ShieldCheck, Eye, X, ChevronRight, Play, Loader2 } from 'lucide-react';
import MarkdownRenderer from '../MarkdownRenderer';
import QuantumChart from '../QuantumChart';
import { useQuantumChat } from '@/hooks/useQuantumChat';
import { generateQuantumCode, runQuantumSimulator, interpretQuantumResults, savePipelineExperiment, extractBatchState } from '@/app/actions/industry-pipeline';
import { useAuth } from '@/context/AuthContext';

interface IndustryChatProps {
    contextConfig?: any;
    placeholder?: string;
    onAnalysisTriggered?: () => void;
}

type WorkflowStage =
    | { kind: 'idle' }
    | { kind: 'step1_loading' }
    | { kind: 'step1_done'; code: string; batchesTotal: number }
    | { kind: 'step2_loading'; code: string; currentBatch: number; totalBatches: number }
    | { kind: 'step2_done'; code: string; simOutput: string; totalBatches: number }
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
                batchIndex: 1, // Start with first batch
            });
            stopTimer();
            setWorkflow({
                kind: 'step1_done',
                code: result.code || result.error || 'No code generated.',
                batchesTotal: result.batchesTotal || 1
            });
        } catch (e: any) {
            stopTimer();
            setWorkflow({ kind: 'step1_done', code: `Error: ${e.message}`, batchesTotal: 1 });
        }
    };

    const runStep2 = async (initialCode: string) => {
        const totalBatches = (workflow as any).batchesTotal || 1;
        let combinedOutput = "";
        let currentBatchCode = initialCode;
        let lastBatchState = "None";

        setWorkflow({ kind: 'step2_loading', code: initialCode, currentBatch: 1, totalBatches });
        startTimer();

        try {
            for (let b = 1; b <= totalBatches; b++) {
                setWorkflow(prev => ({ ...prev, kind: 'step2_loading', currentBatch: b } as any));

                // 1. Generate code for current batch if not the first one (first was done in Step 1)
                if (b > 1) {
                    const genRes = await generateQuantumCode({
                        problem: contextConfig.problem,
                        industry: contextConfig.industry,
                        service: contextConfig.service,
                        hardware: contextConfig.hardware,
                        formData: contextConfig.formData,
                        batchIndex: b,
                        lastBatchState
                    });
                    currentBatchCode = genRes.code;
                }

                // 2. Run Simulator
                const simRes = await runQuantumSimulator({
                    code: currentBatchCode,
                    hardware: contextConfig.hardware
                });

                if (simRes.error) {
                    throw new Error(`Batch ${b} Failed: ${simRes.error}`);
                }

                combinedOutput += `\n\n--- BATCH ${b} ---\n${simRes.output}`;

                // 3. Extract state for next batch if needed
                if (b < totalBatches) {
                    const stateRes = await extractBatchState({ output: simRes.output });
                    lastBatchState = stateRes.state;
                }
            }

            stopTimer();
            setWorkflow({
                kind: 'step2_done',
                code: initialCode,
                simOutput: combinedOutput.trim(),
                totalBatches
            });
        } catch (e: any) {
            stopTimer();
            setWorkflow({
                kind: 'step2_done',
                code: initialCode,
                simOutput: `Error during batch execution: ${e.message}`,
                totalBatches
            });
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

            // Generate Markdown Data Table for Deterministic Routing Output
            let tableHtml = "";
            if (result.assignmentsTable && result.assignmentsTable.length > 0) {
                // Construct standard Markdown table with Problem Details
                const hardware = contextConfig?.hardware || 'Quantum Annealer';
                let qubitCount = 0;
                const pilots = contextConfig?.formData?.number_of_pilots || 0;
                const days = contextConfig?.formData?.days || 0;

                if (contextConfig.industry?.toLowerCase() === 'aviation') {
                    qubitCount = pilots * days;
                } else {
                    // Try to derive it from the assignments, though this is a simplification
                    qubitCount = result.assignmentsTable.length * 2;
                }

                const isFinance = contextConfig.industry?.toLowerCase() === 'finance';
                tableHtml = `### Solution Details\n\n`;
                tableHtml += `| Metric | Configuration |\n`;
                tableHtml += `|:---|:---|\n`;
                tableHtml += `| **Problem** | ${contextConfig?.problem || 'Quantum Solution'} |\n`;
                tableHtml += `| **Hardware** | \`${hardware}\` |\n`;
                tableHtml += `| **Resources** | ${qubitCount} Qubits |\n`;

                if (isFinance && contextConfig?.formData?.sector) {
                    const sectors = Array.isArray(contextConfig.formData.sector)
                        ? contextConfig.formData.sector.join(', ')
                        : contextConfig.formData.sector;
                    tableHtml += `| **Universe** | ${sectors} |\n`;
                }
                tableHtml += `\n`;
                const h1 = isFinance ? 'Status' : 'Period';
                const h2 = isFinance ? 'Ticker' : 'Resource';
                const h3 = isFinance ? 'Asset Details' : 'Assignment';

                tableHtml += `| ${h1} | ${h2} | ${h3} |\n`;
                tableHtml += `|:---|:---|:---|\n`;

                result.assignmentsTable.forEach((row: any) => {
                    const dayVal = row.day.toString().startsWith('Day') ? row.day : `**${row.day}**`;
                    tableHtml += `| ${dayVal} | **${row.pilot}** | ${row.route} |\n`;
                });
            }

            // Inject final analysis as a bot message
            const fullMsg = `${tableHtml}\n\n${result.text}`;
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
                    chartData: result.chartData,
                    assignmentsTable: result.assignmentsTable
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
        { num: 1, label: 'Generate Quantum Code', desc: 'Quantum Guru AI converts the problem into optimized quantum circuits or BQM models' },
        { num: 2, label: 'Run Simulator', desc: 'Execute the program on the selected quantum simulator or hardware' },
        { num: 3, label: 'Interpret Results', desc: 'Quantum Guru AI analyzes measurement outputs and explains the solution in human terms' }
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

                                        const currentBatch = (workflow as any).currentBatch || 1;
                                        const totalBatches = (workflow as any).totalBatches || 1;

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
                                                    {isActive && (
                                                        <div className="flex items-center gap-2">
                                                            {step.num === 2 && (
                                                                <span
                                                                    className="text-[10px] font-black text-white px-2 py-0.5 rounded-full border border-primary/20 shadow-sm"
                                                                    style={{ backgroundColor: '#3066bb' }}
                                                                >
                                                                    BATCH {currentBatch}/{totalBatches}
                                                                </span>
                                                            )}
                                                            <Loader2 size={14} className="animate-spin text-primary shrink-0" />
                                                        </div>
                                                    )}
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
