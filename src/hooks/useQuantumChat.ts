import { useState, useRef, useEffect, useCallback } from 'react';
import { chatWithQuantumAI } from '@/app/actions/chat';
import { getChatHistory, saveMessages } from '@/app/actions/history';

export interface Message {
    id: number;
    text: string;
    sender: 'user' | 'bot' | 'system';
    timestamp: string;
    isStreaming?: boolean;
    executionResult?: { success: boolean; output?: string; error?: string };
    isCodeExecuting?: boolean;
    chartData?: any;
    portfolioMetrics?: any;
    assignmentsTable?: any[];
    outputTables?: any[];
    
    // Workflow Metadata
    workflowType?: 'form' | 'review' | 'pipeline' | 'result';
    workflowData?: {
        blueprint?: any;
        formData?: any;
        qubits?: number;
        batches?: number;
        config?: any;
        isEdited?: boolean;
    };
    workflowSteps?: {
        nlp?: string;
        reasoner?: string;
        suggestor?: string;
        solver?: string;
        verifier?: string;
        dcc?: boolean;
        latex_model?: string;
        optimization_stats?: any;
        solver_routing?: any;
        qa_report?: any;
        compiler_metrics?: any;
        suggested_solver?: string;
        math_rigor?: any;
        classifier?: string;
    };
}

import { useAuth } from '@/context/AuthContext';

export function useQuantumChat(mode: 'industry' | 'market' | 'article' | 'embed' | 'assistant', contextConfig?: any) {
    const { isAuthenticated, user } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [sessionId, setSessionId] = useState<string>('');

    useEffect(() => {
        let storedId = localStorage.getItem('qg_session_id');
        if (!storedId) {
            storedId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('qg_session_id', storedId);
        }
        setSessionId(storedId);
        
        getChatHistory(storedId).then(history => {
            if (history && history.length > 0) {
                setMessages(history);
            }
        });
    }, []);

    useEffect(() => {
        if (sessionId && messages.length > 0) {
            saveMessages(sessionId, messages);
        }
    }, [messages, sessionId]);

    const [inputValue, setInputValue] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [streamingMessageId, setStreamingMessageId] = useState<number | null>(null);
    const [stepOutputs, setStepOutputs] = useState<{ code?: string; sim?: string; analysis?: string }>({});
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLElement>(null);
    const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

    const abortControllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    const contextConfigRef = useRef(contextConfig);
    const isAuthenticatedRef = useRef(isAuthenticated);
    const userEmailRef = useRef(user?.email);
    const inputValueRef = useRef(inputValue);
    const messagesRef = useRef(messages);

    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

    useEffect(() => {
        contextConfigRef.current = contextConfig;
    }, [contextConfig]);

    useEffect(() => {
        isAuthenticatedRef.current = isAuthenticated;
    }, [isAuthenticated]);

    useEffect(() => {
        userEmailRef.current = user?.email;
    }, [user?.email]);

    useEffect(() => {
        inputValueRef.current = inputValue;
    }, [inputValue]);

    // Auto-scroll logic — use scrollTop on container so late layout changes (e.g. code blocks
    // painting after stream ends) don't cause the view to jump upward after scrollIntoView fires.
    const scrollToBottom = () => {
        requestAnimationFrame(() => {
            const container = scrollContainerRef.current;
            if (container) {
                container.scrollTop = container.scrollHeight;
            }
        });
    };

    useEffect(() => {
        if (shouldAutoScroll) {
            scrollToBottom();
        }
    }, [messages, isTyping, shouldAutoScroll]);

    const handleScroll = (e: React.UIEvent<HTMLElement>) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        const isAtBottom = scrollHeight - scrollTop <= clientHeight + 100;
        setShouldAutoScroll(isAtBottom);
    };

    const sendMessage = useCallback(async (text?: string, customConfig?: any, hiddenPrompt?: string) => {
        // Abort previous active request/stream
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        const activeController = new AbortController();
        abortControllerRef.current = activeController;

        setShouldAutoScroll(true);
        const messageToSend = text || inputValueRef.current;
        if (!messageToSend.trim()) return;

        const userMsg: Message = {
            id: Date.now(),
            text: messageToSend,
            sender: 'user',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setMessages(prev => [...prev, userMsg]);
        setInputValue("");
        setIsTyping(true);

        try {
            const fullConfig = {
                ...contextConfigRef.current,
                ...customConfig,
                mode,
                isAuthenticated: isAuthenticatedRef.current,
                userEmail: userEmailRef.current
            };

            // Call API
            const promptToSend = hiddenPrompt || userMsg.text;
            const isDirectModel = fullConfig.isDirect === true;

            let response: any;
            if (fullConfig.selectedPipeline === 'gate_based') {
                // ── Gate-Based Quantum Compiler pipeline (Variant 3) ────────────────
                const botMsgId = Date.now() + 1;
                setMessages(prev => [...prev, {
                    id: botMsgId,
                    text: "Parsing your gate specification...",
                    sender: 'bot',
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    isStreaming: true,
                    workflowSteps: {
                        nlp: "Parsing spec...",
                        reasoner: "", suggestor: "", solver: "", verifier: "", dcc: false
                    }
                }]);
                setIsTyping(false);

                const gbRes = await fetch('/api/gate-model/stream', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    signal: activeController.signal,
                    body: JSON.stringify({
                        model_text: promptToSend,
                        shots: 5000,
                        email: fullConfig.userEmail ?? null,
                        session_id: fullConfig.sessionId ?? sessionId,
                        run_simulator: false, // Decoupled: compile only on initial submit!
                    })
                });

                if (!gbRes.ok) {
                    throw new Error(`Gate model stream failed: ${gbRes.statusText}`);
                }

                const gbReader = gbRes.body?.getReader();
                const gbDecoder = new TextDecoder();
                let gbBuffer = '';

                let gbSteps: any = {
                    parsing: null, compiling: null, simulating: null, output: null
                };

                if (gbReader) {
                    while (true) {
                        const { done, value } = await gbReader.read();
                        if (done) break;
                        gbBuffer += gbDecoder.decode(value, { stream: true });
                        const lines = gbBuffer.split("\n");
                        gbBuffer = lines.pop() || '';

                        for (const line of lines) {
                            if (!line.startsWith('data: ')) continue;
                            try {
                                const update = JSON.parse(line.slice(6));
                                const step = update.step;

                                if (step === 'error') {
                                    setMessages(prev => prev.map(m =>
                                        m.id === botMsgId ? {
                                            ...m,
                                            text: `Pipeline error: ${update.message}`,
                                            isStreaming: false
                                        } : m
                                    ));
                                    break;
                                }

                                gbSteps[step] = update;

                                let progressText = `### Quantum Simulation Completed\n\n`;
                                if (gbSteps.output) {
                                    progressText = gbSteps.output.output_text;
                                } else if (gbSteps.simulating) {
                                    progressText = `### Simulating Circuit...\nRunning local simulator with 5,000 shots.`;
                                } else if (gbSteps.compiling) {
                                    progressText = `### Compiling Circuit...\nCompiling custom JSON specification to Qiskit and PennyLane.`;
                                } else {
                                    progressText = `### Parsing Circuit...\nParsing your input circuit JSON.`;
                                }

                                setMessages(prev => prev.map(m =>
                                    m.id === botMsgId ? {
                                        ...m,
                                        text: progressText,
                                        isStreaming: step !== 'output',
                                        workflowSteps: {
                                            nlp: gbSteps.parsing?.message || 'Parsing...',
                                            reasoner: gbSteps.compiling?.message || '',
                                            suggestor: gbSteps.compiling?.message || '',
                                            solver: gbSteps.simulating?.message || '',
                                            verifier: gbSteps.output?.message || '',
                                            dcc: true,
                                            suggested_solver: 'GATE_BASED',
                                            final_code: gbSteps.compiling?.qiskit_code || '',
                                            pennylane_code: gbSteps.compiling?.pennylane_code || '',
                                            cirq_code: gbSteps.compiling?.cirq_code || '',
                                            braket_code: gbSteps.compiling?.braket_code || '',
                                            openqasm_code: gbSteps.compiling?.openqasm_code || '',
                                            q_matrix_preview: gbSteps.compiling?.ascii_circuit || '',
                                            optimization_stats: gbSteps.simulating ? {
                                                qubits: gbSteps.compiling?.num_qubits || 2,
                                                depth: gbSteps.compiling?.depth || 0,
                                                gate_count: gbSteps.compiling?.gate_count || 0,
                                                counts: gbSteps.simulating.counts || {},
                                                pennylane_code: gbSteps.compiling?.pennylane_code || '',
                                                cirq_code: gbSteps.compiling?.cirq_code || '',
                                                braket_code: gbSteps.compiling?.braket_code || '',
                                                openqasm_code: gbSteps.compiling?.openqasm_code || '',
                                            } : null,
                                            parsingStatus: gbSteps.parsing?.status || 'pending',
                                            qMatrixStatus: gbSteps.compiling?.status || 'pending',
                                            quboCodeStatus: gbSteps.compiling?.status || 'pending',
                                            simulatorStatus: gbSteps.simulating?.status || 'pending',
                                            outputStatus: gbSteps.output?.status || 'pending',
                                        }
                                    } : m
                                ));
                            } catch (_) { }
                        }
                    }
                    setMessages(prev => prev.map(m =>
                        m.id === botMsgId ? { ...m, isStreaming: false } : m
                    ));
                }
                setIsTyping(false);
                return;
            } else if (isDirectModel) {
                // ── Direct Optimization Model pipeline (short circuit) ──────────────
                const botMsgId = Date.now() + 1;
                setMessages(prev => [...prev, {
                    id: botMsgId,
                    text: "Parsing your optimization model...",
                    sender: 'bot',
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    isStreaming: true,
                    workflowSteps: {
                        nlp: "Parsing model...",
                        reasoner: "", suggestor: "", solver: "", verifier: "", dcc: false
                    }
                }]);
                setIsTyping(false);

                const latestBotWithNlp = [...messagesRef.current].reverse().find(m => m.sender === 'bot' && m.workflowSteps?.nlp?.startsWith('{'));
                const specToSend = latestBotWithNlp?.workflowSteps?.nlp || promptToSend;

                const dmRes = await fetch('/api/direct-model/stream', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    signal: activeController.signal,
                    body: JSON.stringify({
                        model_text: specToSend,
                        penalty_choice: fullConfig.selectedPenalty === 'custom'
                            ? parseInt(fullConfig.customPenalty || '30')
                            : (fullConfig.selectedPenalty ?? 3),
                        num_reads: 5000,
                        run_solver: fullConfig.runSolver === true,
                        email: fullConfig.userEmail ?? null,
                        session_id: fullConfig.sessionId ?? sessionId,
                    })
                });

                if (!dmRes.ok) {
                    throw new Error(`Direct model stream failed: ${dmRes.statusText}`);
                }

                const dmReader = dmRes.body?.getReader();
                const dmDecoder = new TextDecoder();
                let dmBuffer = '';

                let dmSteps: any = {
                    parsing: null, q_matrix: null, qubo_code: null,
                    simulator: null, output: null
                };
                let dmFinalText = '';

                if (dmReader) {
                    while (true) {
                        const { done, value } = await dmReader.read();
                        if (done) break;
                        dmBuffer += dmDecoder.decode(value, { stream: true });
                        const lines = dmBuffer.split("\n");
                        dmBuffer = lines.pop() || '';

                        for (const line of lines) {
                            if (!line.startsWith('data: ')) continue;
                            try {
                                const update = JSON.parse(line.slice(6));
                                const step = update.step;

                                if (step === 'error') {
                                    setMessages(prev => prev.map(m =>
                                        m.id === botMsgId ? {
                                            ...m,
                                            text: `Pipeline error: ${update.message}`,
                                            isStreaming: false
                                        } : m
                                    ));
                                    break;
                                }

                                if (step === 'complete') {
                                    const qPrev: string = (update as any).q_matrix_preview || '';
                                    const finalCode: string = (update as any).final_code || '';
                                    if (qPrev || finalCode) {
                                        setMessages((prev: any[]) => prev.map((m: any) => {
                                            if (m.id !== botMsgId) return m;
                                            const existing = m.workflowSteps || {};
                                            return {
                                                ...m,
                                                workflowSteps: {
                                                    ...existing,
                                                    q_matrix_preview: qPrev || existing.q_matrix_preview || '',
                                                    final_code: finalCode || existing.final_code || '',
                                                }
                                            };
                                        }));
                                    }
                                    continue;
                                }

                                dmSteps[step] = update;

                                // Build progressive text (NO ICONS/EMOJIS AT ALL!)
                                let progressHeader = `### Quantum Compilation Progress\n`;
                                
                                // Step 1: Model Parsing
                                if (dmSteps.parsing?.status === 'done') {
                                    progressHeader += `* **Model Parsing**: Done\n`;
                                } else if (dmSteps.parsing) {
                                    progressHeader += `* **Model Parsing**: In Progress\n`;
                                } else {
                                    progressHeader += `* **Model Parsing**: Pending\n`;
                                }

                                // Step 2: Q-Matrix Construction
                                if (dmSteps.q_matrix?.status === 'done') {
                                    progressHeader += `* **Q-Matrix Construction**: Done\n`;
                                } else if (dmSteps.q_matrix?.status === 'running') {
                                    progressHeader += `* **Q-Matrix Construction**: In Progress\n`;
                                } else {
                                    progressHeader += `* **Q-Matrix Construction**: Pending\n`;
                                }

                                // Step 3: QUBO Code Generation
                                if (dmSteps.qubo_code?.status === 'done') {
                                    progressHeader += `* **QUBO Code Generation**: Done\n`;
                                } else if (dmSteps.qubo_code) {
                                    progressHeader += `* **QUBO Code Generation**: In Progress\n`;
                                } else {
                                    progressHeader += `* **QUBO Code Generation**: Pending\n`;
                                }

                                progressHeader += `\n---\n\n`;

                                let progressText = progressHeader;
                                if (dmSteps.parsing) {
                                    if (dmSteps.parsing.status === 'done') {
                                        progressText += `### Model Parsing\n`;
                                        progressText += `* **Status**: parsed successfully\n`;
                                        progressText += `* **Variables**: ${dmSteps.parsing.variables?.map((v: string) => `\`${v}\``).join(', ') || 'none'}\n`;
                                        progressText += `* **Constraints**: ${dmSteps.parsing.constraints?.length || 0} registered\n\n`;
                                    } else {
                                        progressText += `**Parsing model...**\n\n`;
                                    }
                                }
                                
                                if (dmSteps.q_matrix) {
                                    if (dmSteps.q_matrix.status === 'done') {
                                        progressText += `### Q-Matrix Summary\n`;
                                        progressText += `* **Dimension**: ${dmSteps.q_matrix.q_size} × ${dmSteps.q_matrix.q_size} logical qubits\n`;
                                        progressText += `* **Non-zero entries**: ${dmSteps.q_matrix.q_nnz}\n`;
                                        progressText += `* **Penalty Applied**: ${dmSteps.q_matrix.penalty_label} (λ = ${dmSteps.q_matrix.penalty_weight})\n\n`;
                                        
                                        if (dmSteps.q_matrix.q_preview && dmSteps.q_matrix.q_preview.length > 0) {
                                            progressText += `**Non-Zero Couplings Preview (top variables):**\n\`\`\`text\n`;
                                            dmSteps.q_matrix.q_preview.forEach((row: any) => {
                                                Object.entries(row).forEach(([key, val]) => {
                                                    progressText += `  ${key} = ${val}\n`;
                                                });
                                            });
                                            progressText += `\`\`\`\n\n`;
                                        }
                                    } else if (dmSteps.q_matrix.status === 'running') {
                                        progressText += `**Building Q Matrix...**\n\n`;
                                    }
                                }
                                
                                if (dmSteps.qubo_code) {
                                    if (dmSteps.qubo_code.status === 'done') {
                                        progressText += `### Generated QUBO Code\n`;
                                        progressText += `The compiled quadratic objective model is translated into the Python script below.\n\n`;
                                        progressText += `\`\`\`python\n${dmSteps.qubo_code.code}\n\`\`\`\n\n`;
                                    }
                                }

                                if (dmSteps.simulator) {
                                    if (dmSteps.simulator.status === 'running') {
                                        progressText += `---\n\n### ⏳ Running Solver...\n`;
                                        progressText += `Running D-Wave Simulated Annealing (${(dmSteps.simulator.num_reads || 5000).toLocaleString()} reads)...\n\n`;
                                    } else if (dmSteps.simulator.status === 'done') {
                                        progressText += `---\n\n### ✅ Solver Complete\n`;
                                    }
                                }

                                if (dmSteps.output && dmSteps.output.status === 'done') {
                                    progressText += (dmSteps.output.output_text || '') + '\n\n';
                                }

                                setMessages(prev => prev.map(m =>
                                    m.id === botMsgId ? {
                                        ...m,
                                        text: progressText,
                                        isStreaming: step !== 'output',
                                        workflowSteps: {
                                            nlp: specToSend,
                                            reasoner: dmSteps.q_matrix?.message || '',
                                            suggestor: dmSteps.qubo_code?.message || '',
                                            solver: dmSteps.simulator?.message || '',
                                            verifier: dmSteps.output?.message || '',
                                            solver_output: dmSteps.output?.output_text || '',
                                            dcc: false,
                                            suggested_solver: dmSteps.simulator?.sampler || 'D-Wave SA',
                                            math_rigor: null,
                                            optimization_stats: dmSteps.q_matrix ? {
                                                q_size: dmSteps.q_matrix.q_size,
                                                q_nnz: dmSteps.q_matrix.q_nnz,
                                                penalty_label: dmSteps.q_matrix.penalty_label,
                                                penalty_weight: dmSteps.q_matrix.penalty_weight,
                                                decision_vars_count: dmSteps.q_matrix.decision_vars_count,
                                                slack_vars_count: dmSteps.q_matrix.slack_vars_count,
                                                matrix_density: dmSteps.q_matrix.matrix_density,
                                                certificate_status: dmSteps.q_matrix.certificate_status,
                                            } : null,
                                            parsingStatus: dmSteps.parsing?.status || 'pending',
                                            qMatrixStatus: dmSteps.q_matrix?.status || 'pending',
                                            quboCodeStatus: dmSteps.qubo_code?.status || 'pending',
                                            simulatorStatus: dmSteps.simulator?.status || 'pending',
                                            outputStatus: dmSteps.output?.status || 'pending',
                                        }
                                    } : m
                                ));
                            } catch (_) { /* skip malformed line */ }
                        }
                    }
                    setMessages(prev => prev.map(m =>
                        m.id === botMsgId ? { ...m, isStreaming: false } : m
                    ));
                }
                setIsTyping(false);
                return; // Prevent fallthrough to chatbot response logic

            } else {
                console.log(`[useQuantumChat] Sending message to Groq (mode: ${mode}):`, promptToSend);
                // Forward penalty_choice so the multi-agent pipeline uses it when QUBO is selected
                const penaltyForPipeline = fullConfig.selectedPenalty === 'custom'
                    ? parseInt(fullConfig.customPenalty || '30')
                    : (typeof fullConfig.selectedPenalty === 'number' ? fullConfig.selectedPenalty : 3);
                response = await chatWithQuantumAI(promptToSend, 'chat', 'en', { ...fullConfig, penalty_choice: penaltyForPipeline });
            }

            // Dispatch token usage event to sidebar indicator
            if (response.tokensUsed !== undefined) {
                window.dispatchEvent(new CustomEvent('qg:token-update', { detail: { delta: response.tokensUsed } }));
            }

            // Extract step output markers (code, sim output)
            let cleanText = response.text;
            const stepCodeMatch = cleanText.match(/\[STEP_CODE\]([\s\S]*?)\[\/STEP_CODE\]/);
            const stepSimMatch = cleanText.match(/\[STEP_SIM\]([\s\S]*?)\[\/STEP_SIM\]/);
            if (stepCodeMatch || stepSimMatch) {
                setStepOutputs({
                    code: stepCodeMatch?.[1]?.trim(),
                    sim: stepSimMatch?.[1]?.trim(),
                    analysis: undefined // will be filled later from cleanText
                });
                cleanText = cleanText
                    .replace(/\[STEP_CODE\][\s\S]*?\[\/STEP_CODE\]/, '')
                    .replace(/\[STEP_SIM\][\s\S]*?\[\/STEP_SIM\]/, '')
                    .trim();
            }

            // Handle Chart Data
            let chartData = null;
            const chartMatch = cleanText.match(/\[CHART_DATA\]([\s\S]*?)\[\/CHART_DATA\]/);
            if (chartMatch) {
                try {
                    chartData = JSON.parse(chartMatch[1]);
                    cleanText = cleanText.replace(/\[CHART_DATA\][\s\S]*?\[\/CHART_DATA\]/, '').trim();
                } catch (e) {
                    console.error("Failed to parse chart data");
                }
            }

            // Store final analysis text in stepOutputs
            setStepOutputs(prev => ({ ...prev, analysis: cleanText }));

            // Simulate Streaming
            const botMsgId = Date.now() + 1;
            setStreamingMessageId(botMsgId);

            setIsTyping(false); // Stop typing just as the bubble appears
            setMessages(prev => [...prev, {
                id: botMsgId,
                text: "",
                sender: 'bot',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                isStreaming: true,
                chartData,
                workflowSteps: response.workflowSteps
            }]);

            // Render the full response immediately — no artificial word-by-word delay
            setMessages(prev => prev.map(msg =>
                msg.id === botMsgId ? { ...msg, text: cleanText, isStreaming: false } : msg
            ));
            setStreamingMessageId(null);

        } catch (error: any) {
            if (error.name === 'AbortError') {
                console.log("Request aborted successfully.");
                return;
            }
            console.error("Chat Error:", error);
            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                text: "Error: Neural link unstable. Please retry transmission.",
                sender: 'bot',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }]);
        } finally {
            setIsTyping(false);
        }
    }, [mode]);

    const addBotMessage = (text: string, chartData?: any, portfolioMetrics?: any, assignmentsTable?: any[], outputTables?: any[]) => {
        const botMsgId = Date.now() + 1;
        setMessages(prev => [...prev, {
            id: botMsgId,
            text,
            sender: 'bot',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            chartData,
            portfolioMetrics,
            assignmentsTable,
            outputTables
        }]);
    };

    const updateMessageExecutionResult = useCallback((msgId: number, result: any) => {
        setMessages(prev => prev.map(msg => 
            msg.id === msgId ? { ...msg, executionResult: result } : msg
        ));
    }, []);

    return {
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
        stepOutputs,
        updateMessageExecutionResult
    };
}
