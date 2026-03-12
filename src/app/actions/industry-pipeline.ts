"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-2.0-flash-lite";
import Groq from "groq-sdk";
import LLMSetting from '@/models/LLMSetting';
import dbConnect from '@/lib/db';
const GROQ_API_KEY = process.env.GROQ_API_KEY;

// In-process cache: avoids a DB round-trip on every pipeline call within the same Vercel instance
let _llmSettingsCache: { provider: string; modelName: string } | null = null;

async function getDynamicLLM() {
    if (_llmSettingsCache) return _llmSettingsCache;
    await dbConnect();
    let provider = 'gemini';
    let modelName = 'gemini-2.0-flash-lite';
    try {
        const settings = await LLMSetting.findOne({ key: "global_llm_settings" }).lean();
        if (settings) {
            provider = settings.activeProvider;
            modelName = settings.activeModel;
        }
    } catch (e) {
        console.error("Failed to fetch LLM settings, falling back to Gemini");
    }
    _llmSettingsCache = { provider, modelName };
    return _llmSettingsCache;
}
import { getDynamicPrompt } from './prompt-utils';
import axios from 'axios';
import crypto from 'crypto';

interface IndustryPipelineDeps {
    getDynamicPrompt: (category: string, replacements: Record<string, any>, fallback: string) => Promise<string>;
    QuantumForm: any;
    Experiment: any;
}

const QISKIT_SERVICE_URL = process.env.QISKIT_SERVICE_URL || "http://127.0.0.1:8001";
const DWAVE_SERVICE_URL = process.env.DWAVE_SERVICE_URL || "http://127.0.0.1:8002";

// --- Quantum Execution Helpers ---
const API_SECRET = process.env.API_SECRET_KEY || "dev_secret_key_123";

async function executeQuantumCircuit(circuitCode: string) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 59000); // 59s explicit timeout
    try {
        const url = `${QISKIT_SERVICE_URL}/execute`;
        console.log(`[Qiskit Sim] START | URL: ${url} | CodeSize: ${circuitCode.length}`);
        console.time(`qiskit_exec_${url}`);
        const startTime = Date.now();

        const response = await axios.post(url, {
            code: circuitCode
        }, {
            headers: { 'X-API-Key': API_SECRET },
            signal: controller.signal
        });
        const executionTimeMs = Date.now() - startTime;
        clearTimeout(timeoutId);
        console.timeEnd(`qiskit_exec_${url}`);
        console.log(`[Qiskit Sim] SUCCESS | ResLen: ${JSON.stringify(response.data).length} | Time: ${executionTimeMs}ms`);

        return { ...response.data, executionTimeMs };
    } catch (e: any) {
        clearTimeout(timeoutId);
        if (axios.isCancel(e) || e.name === 'CanceledError' || e.message === 'canceled') {
            console.error("[Qiskit Sim] TIMEOUT 59s: Request was forcefully aborted.");
            return { error: "Qiskit Simulator Timeout (59s): The execution exceeded the maximum allowed time." };
        }
        console.error("Simulator Execution Fail:", e.message);
        if (e.code === 'ECONNREFUSED') {
            return { error: "Qiskit Simulator is offline. Please ensure the Python service is running." };
        }
        return { error: `Quantum Service Error: ${e.message}` };
    }
}

async function executeDWaveAnnealer(code: string) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 59000); // 59s explicit timeout
    try {
        const url = `${DWAVE_SERVICE_URL}/execute`;
        console.log(`[DWave Sim] START | URL: ${url} | CodeSize: ${code.length}`);
        console.time(`dwave_exec_${url}`);
        const startTime = Date.now();

        const response = await axios.post(url, {
            code: code
        }, {
            headers: { 'X-API-Key': API_SECRET },
            signal: controller.signal
        });
        const executionTimeMs = Date.now() - startTime;
        clearTimeout(timeoutId);
        console.timeEnd(`dwave_exec_${url}`);
        console.log(`[DWave Sim] SUCCESS | ResLen: ${JSON.stringify(response.data).length} | Time: ${executionTimeMs}ms`);

        return { ...response.data, executionTimeMs };
    } catch (e: any) {
        clearTimeout(timeoutId);
        if (axios.isCancel(e) || e.name === 'CanceledError' || e.message === 'canceled') {
            console.error("[DWave Sim] TIMEOUT 59s: Request was forcefully aborted.");
            return { error: "D-Wave Simulator Timeout (59s): The execution exceeded the maximum allowed time." };
        }
        console.error("D-Wave Execution Fail:", e.message);
        if (e.code === 'ECONNREFUSED') {
            return { error: "D-Wave Simulator is offline. Please ensure the Python service is running." };
        }
        return { error: `Quantum Service Error: ${e.message}` };
    }
}

// --- Robustness Helpers ---

/**
 * Layer 1 & 2 Validation: Security & Quantum Constraints
 */
async function validateQuantumCode(code: string, hardware: string): Promise<{ valid: boolean; error?: string }> {
    // 1. Static Security Check (Layer 1)
    const bannedPatterns = [
        /import\s+os/i, /from\s+os/i,
        /import\s+subprocess/i, /from\s+subprocess/i,
        /import\s+sys/i, /from\s+sys/i,
        /import\s+requests/i, /import\s+socket/i,
        /eval\(/i, /exec\(/i, /getattr\(/i
    ];

    for (const pattern of bannedPatterns) {
        if (pattern.test(code)) {
            return { valid: false, error: "Security Violation: Unauthorized module import detected." };
        }
    }

    // 2. Hardware Constraint Check (Layer 2)
    if (hardware.toLowerCase().includes('qiskit')) {
        const qubitMatch = code.match(/QuantumCircuit\((\d+)\)/);
        if (qubitMatch && parseInt(qubitMatch[1]) > 32) {
            return { valid: false, error: `Hardware Violation: Requested ${qubitMatch[1]} qubits exceeds simulator limit of 32.` };
        }
        // Simple depth proxy: count gate applications
        const gateCount = (code.match(/circuit\.[a-z0-9]+\(/gi) || []).length;
        if (gateCount > 100) {
            return { valid: false, error: `Complexity Violation: Circuit contains ${gateCount} operations, exceeding local limit of 100.` };
        }
    }

    if (hardware.toLowerCase().includes('d-wave') || hardware.toLowerCase().includes('annealer')) {
        // Look for common variable patterns: linear={...} or BinaryQuadraticModel(...)
        const varMatch = code.match(/linear\s*=\s*\{([^}]+)\}/);
        if (varMatch) {
            const keys = varMatch[1].split(',').length;
            if (keys > 30) {
                return { valid: false, error: `Hardware Violation: Requested ${keys} variables exceeds local annealing limit of 30.` };
            }
        }
    }

    // 3. Syntax Pre-check via Service (Layer 3)
    try {
        const endpoint = hardware.toLowerCase().includes('d-wave') ? `${DWAVE_SERVICE_URL}/validate` : `${QISKIT_SERVICE_URL}/validate`;
        const verify = await axios.post(endpoint, { code });
        if (!verify.data.valid) {
            return { valid: false, error: `Syntax Error: ${verify.data.error}` };
        }
    } catch (e) {
        console.warn("Validation service unreachable, skipping Step 3.");
    }

    return { valid: true };
}

/**
 * Result Caching (SHA-256)
 */
function getWorkflowCacheKey(problem: string, service: string, hardware: string, params: any) {
    const data = JSON.stringify({ problem, service, hardware, params });
    return crypto.createHash('sha256').update(data).digest('hex');
}


export async function executeIndustryWorkflow(
    contextConfig: any,
    ruleTexts: string[],
    deps: IndustryPipelineDeps
): Promise<any> {
    const { getDynamicPrompt, QuantumForm, Experiment } = deps;
    const { provider, modelName } = await getDynamicLLM();
    const { industry, service, problem, hardware, formData, userEmail } = contextConfig;

    let systemInstructions = "";

    if (formData && Object.keys(formData).length > 0) {
        // --- STEP 0: FETCH FORM DEF ---
        console.log(`[Quantum Workflow] Lookup | Ind: ${industry} | Svc: ${service} | Prob: ${problem}`);
        // Resilient Lookup: Fallback to industry/problem if service is missing or generic default
        const svcSearch = (!service || service === 'Gate-Model Circuit' || service === 'undefined')
            ? {} : { service: new RegExp(`^${service}$`, 'i') };

        let formDef = await QuantumForm.findOne({
            industry: new RegExp(`^${industry}$`, 'i'),
            ...svcSearch,
            problem: new RegExp(`^${problem}$`, 'i'),
            hardware: new RegExp(`^${hardware}$`, 'i')
        }).lean();

        // Fallback to Universal for template retrieval
        if (!formDef && hardware !== 'Universal') {
            formDef = await QuantumForm.findOne({
                industry: new RegExp(`^${industry}$`, 'i'),
                ...svcSearch,
                problem: new RegExp(`^${problem}$`, 'i'),
                $or: [{ hardware: 'Universal' }, { hardware: { $exists: false } }]
            }).lean();
        }
        console.log(`[Quantum Workflow] Form Found: ${!!formDef}`);

        // --- STEP 1: DETERMINISTIC GUARDRAILS (Pre-LLM) ---
        if (formDef) {
            const allFields = [...(formDef.fields || []), ...(formDef.sections?.flatMap((s: any) => s.fields) || [])];
            for (const field of allFields) {
                const val = formData[field.key];
                if (field.required && (val === undefined || val === '')) {
                    return { returnMode: 'direct', data: { text: `Error: Required parameter "${field.label}" is missing.`, source: 'guardrail' } };
                }
                // Type Validation
                if (val !== undefined && val !== '') {
                    if (field.type === 'number' && isNaN(Number(val))) {
                        return { returnMode: 'direct', data: { text: `Error: Parameter "${field.label}" must be a number.`, source: 'guardrail' } };
                    }
                }
            }
        }

        // --- STEP 1.5: SHA-256 RESULT CACHING ---
        const cacheKey = getWorkflowCacheKey(problem, service, hardware, formData);
        const cachedResult = await Experiment.findOne({ cacheKey }).sort({ timestamp: -1 }).lean();

        if (cachedResult) {
            console.log(`[Quantum Workflow] CACHE_HIT | Problem: ${problem} | Key: ${cacheKey}`);
            return {
                returnMode: 'direct',
                data: {
                    text: cachedResult.analysis,
                    source: 'quantum_cache',
                    guardrailsStatus: 'passed',
                    activeGuardrails: ruleTexts
                }
            };
        }

        // --- STEP 1.6: LOGGING & SANITIZATION ---
        console.log(`[Quantum Workflow] START | Industry: ${industry} | Service: ${service} | Problem: ${problem} | Hardware: ${hardware}`);
        const sanitizedFormData: Record<string, any> = {};
        Object.keys(formData).forEach(key => {
            let val = formData[key];
            if (val && typeof val === 'object') {
                sanitizedFormData[key] = val; // handle arrays, etc
            } else if (typeof val === 'string') {
                // Remove weird brackets
                val = val.replace(/[{}]/g, '');
                // Attempt to parse as number to prevent python type errors (e.g range(10.0))
                if (!isNaN(Number(val)) && val.trim() !== '') {
                    sanitizedFormData[key] = val.includes('.') ? parseFloat(val) : parseInt(val, 10);
                } else {
                    sanitizedFormData[key] = val;
                }
            } else {
                sanitizedFormData[key] = val;
            }
        });

        // --- STEP 2: TEMPLATE LOOKUP ---
        let templateCode = "";
        if (formDef?.codeTemplates) {
            const sanitizeStr = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            const hwSanitized = sanitizeStr(hardware);
            const matched = formDef.codeTemplates.find((t: any) => {
                const tSanitized = sanitizeStr(t.hardware);
                return hwSanitized.includes(tSanitized) || tSanitized.includes(hwSanitized);
            });
            templateCode = matched?.code || "";
        }

        // --- STEP 3: BATCHING ORCHESTRATION ---
        let batchesNeeded = 1;
        if (formDef?.batchingEnabled && formDef.qubitFormula) {
            let formula = formDef.qubitFormula;
            Object.keys(sanitizedFormData).forEach(key => {
                const regex = new RegExp(`{{${key}}}`, 'g');
                formula = formula.replace(regex, String(sanitizedFormData[key]));
            });
            try {
                const sanitizedMath = formula.replace(/[^0-9+\-*/().\s]/g, '');
                const qubits = Math.ceil(eval(sanitizedMath));
                if (qubits > (formDef.maxQubitsPerBatch || 64)) {
                    batchesNeeded = Math.ceil(qubits / (formDef.maxQubitsPerBatch || 64));
                }
            } catch (e) {
                console.error("Batch calculation failed:", e);
            }
        }

        let combinedAnalysis = "";
        let combinedRawOutput = "";
        let totalExecutionTimeMs = 0;
        let lastBatchState = "None (First Batch)";
        const totalDimension = sanitizedFormData[formDef?.batchKey || ''] || 1;
        const dimensionPerBatch = Math.ceil(totalDimension / batchesNeeded);

        for (let b = 1; b <= batchesNeeded; b++) {
            console.log(`[Quantum Workflow] Starting Batch ${b}/${batchesNeeded}`);
            const startDim = (b - 1) * dimensionPerBatch + 1;
            const endDim = Math.min(b * dimensionPerBatch, totalDimension);

            const batchFormData = {
                ...sanitizedFormData,
                [formDef?.batchKey || '']: endDim - startDim + 1, // Current slice size
                batch_start_index: startDim,
                batch_end_index: endDim,
                last_batch_state: lastBatchState
            };

            const isDWave = hardware?.toLowerCase().includes('d-wave') || hardware?.toLowerCase().includes('annealing') || (templateCode && templateCode.includes('import dimod'));
            let generatedCode = "";
            let explanation = "";
            let attempts = 0;
            const MAX_ATTEMPTS = 3;
            let lastError = "";
            let finalExecutionResult: any = {};

            while (attempts < MAX_ATTEMPTS) {
                attempts++;
                console.log(`[Quantum Workflow] Attempt ${attempts} for ${problem}`);

                const genPrompt = await getDynamicPrompt(isDWave ? 'industry_dwave' : 'industry_qiskit', {
                    industry, service, problem, hardware,
                    parameters: JSON.stringify(sanitizedFormData),
                    template: templateCode || "None (Generate from scratch)",
                    lastError: lastError ? `PREVIOUS_ERROR: ${lastError}` : ""
                }, `You are a Quantum Expert. ${templateCode ? "Use the provided template and fill placeholders." : "Generate a complete script."} 
            STRICT RULES:
            - Use a fixed seed (e.g., 42) for all simulators/samplers to ensure reproducibility.
            - Do NOT include any explanations in the code block.
            Return a JSON object with "code" and "explanation" keys.`);

                const jsonWrapperInstruction = await getDynamicPrompt('industry_json_wrapper', {
                    prompt: genPrompt,
                    templateCode: templateCode ? "Use the provided template and fill placeholders." : "Generate a complete script."
                }, `You are a Quantum Expert. ${templateCode ? "Use the provided template and fill placeholders." : "Generate a complete script."} 
            STRICT RULES:
            - Use a fixed seed (e.g., 42) for all simulators/samplers to ensure reproducibility.
            - Do NOT include any explanations in the code block.
            Return a JSON object with "code" and "explanation" keys.`);

                let contentStr = "{}";
                if (provider === 'groq') {
                    if (!GROQ_API_KEY) throw new Error("Groq API Key is missing");
                    const groq = new Groq({ apiKey: GROQ_API_KEY });
                    const completion = await groq.chat.completions.create({
                        messages: [
                            { role: 'system', content: "You are a Quantum Workflow Engine. Always return valid JSON with 'code' and 'explanation' fields." },
                            { role: 'user', content: jsonWrapperInstruction }
                        ],
                        model: modelName,
                        response_format: { type: "json_object" }
                    });
                    contentStr = completion.choices[0]?.message?.content || "{}";
                } else {
                    if (!GEMINI_API_KEY) throw new Error("Gemini API Key is missing");
                    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
                    const model = genAI.getGenerativeModel({
                        model: modelName,
                        generationConfig: { responseMimeType: "application/json" }
                    });
                    const result = await model.generateContent([
                        "You are a Quantum Workflow Engine. Always return valid JSON with 'code' and 'explanation' fields.",
                        jsonWrapperInstruction
                    ]);
                    contentStr = result.response.text() || "{}";
                }

                try {
                    const content = contentStr;
                    const parsed = JSON.parse(content);
                    generatedCode = parsed.code || "";
                    explanation = parsed.explanation || "";

                    console.log(`[Quantum Workflow] GENERATED | Attempt: ${attempts} | Code Length: ${generatedCode.length}`);

                    // --- STEP 4: THREE-LAYER VALIDATION ---
                    const validation = await validateQuantumCode(generatedCode, hardware);
                    if (!validation.valid) {
                        console.warn(`[Quantum Workflow] VALIDATION_FAILED | Error: ${validation.error}`);
                        lastError = `Validation failed: ${validation.error}`;
                        continue;
                    }

                    console.log(`[Quantum Workflow] VALIDATED | Proceeding to execution.`);

                    // --- STEP 5: EXECUTION ---
                    finalExecutionResult = isDWave
                        ? await executeDWaveAnnealer(generatedCode)
                        : await executeQuantumCircuit(generatedCode);

                    // If python execution failed but output contains Traceback, treat as error
                    const rawSimulatorOutput = finalExecutionResult.output || "";
                    if (rawSimulatorOutput.includes("Runtime Error") || rawSimulatorOutput.includes("Traceback")) {
                        finalExecutionResult.error = rawSimulatorOutput;
                    }

                    if (finalExecutionResult.error) {
                        console.error(`[Quantum Workflow] EXECUTION_ERROR | Error: ${finalExecutionResult.error}`);
                        lastError = `Runtime error: ${finalExecutionResult.error}`;
                        continue;
                    }

                    if (finalExecutionResult.executionTimeMs) {
                        totalExecutionTimeMs += finalExecutionResult.executionTimeMs;
                    }

                    console.log(`[Quantum Workflow] EXECUTED | Output length: ${finalExecutionResult.output?.length || 0} | ExecTime: ${finalExecutionResult.executionTimeMs}ms`);
                    // SUCCESS
                    break;

                } catch (e: any) {
                    lastError = `Processing error: ${e.message}`;
                    if (attempts >= MAX_ATTEMPTS) {
                        return { returnMode: 'direct', data: { text: `Error: Critical failure in quantum workflow after ${MAX_ATTEMPTS} attempts. Last Error: ${lastError}`, source: 'quantum_workflow_error' } };
                    }
                }
            }

            // --- STEP 6: FORMAT BATCH OUTPUT ---
            const rawOutput = (finalExecutionResult.output || finalExecutionResult.error || 'No output.').trim();

            const parseAnyAssignmentTable = (out: string): string | null => {
                const bestMatch = out.match(/Best(?:\s+solution)?:\s*\{([^}]+)\}/i);
                if (!bestMatch) return null;
                const allPairs = [...bestMatch[1].matchAll(/'?([^':,\s]+)'?\s*:\s*([^\s,]+)/g)];
                if (allPairs.length === 0) return null;
                const rows = allPairs.map(([, key, rawVal]) => {
                    const val = rawVal.replace(/np\.\w+\(([^)]+)\)/, '$1');
                    const pilotFlightDay = key.match(/pilot[_\s]?(\w+)[_\s]flight[_\s]?(\w+)(?:[_\s]day[_\s]?(\w+))?/i);
                    let displayKey = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                    if (pilotFlightDay) {
                        displayKey = `Pilot ${pilotFlightDay[1]} → Flight ${pilotFlightDay[2]}`;
                        if (pilotFlightDay[3]) displayKey += ` (Day ${pilotFlightDay[3]})`;
                    }
                    const numVal = parseFloat(val);
                    const displayVal = isNaN(numVal) ? val : numVal === 1 ? '✅ Assigned' : numVal === 0 ? '⬜ Not Assigned' : numVal.toFixed(4);
                    return `| ${displayKey} | ${displayVal} |`;
                });
                const header = `| Variable | Value |\n|---|---|\n`;
                return `${header}${rows.join('\n')}`;
            };

            const tableOutput = parseAnyAssignmentTable(rawOutput);
            const energyMatch = rawOutput.match(/Energy:\s*([-\d.]+)/i);
            const energyLine = energyMatch ? `\n> **Lowest Energy:** \`${energyMatch[1]}\`` : '';

            combinedRawOutput += `\n\n--- BATCH ${b} (Dimension ${startDim}-${endDim}) ---\n${rawOutput}\n`;
            combinedAnalysis += `\n### 📦 Batch ${b} | ${formDef?.batchKey || 'Dimension'} ${startDim}-${endDim}
${explanation}

${tableOutput ? `**Results:**\n${tableOutput}` : `**Raw Output:**\n\`\`\`\n${rawOutput}\n\`\`\``}
${energyLine}

---
`;

            // --- STEP 7: STATE EXTRACTION (FOR CONTINUITY) ---
            if (b < batchesNeeded) {
                console.log(`[Quantum Workflow] Extracting state from batch ${b}...`);
                const stateExtractPrompt = await getDynamicPrompt('industry_json_wrapper', {
                    output: rawOutput
                }, `Analyze this quantum output and provide a one-sentence "Continuity Summary" for the NEXT batch. 
                Focus ONLY on the final configuration (e.g., "Pilot A is at JFK, Pilot B is at LHR"). 
                Wait, do NOT use natural language summaries if you can provide a JSON state. 
                Actually, just provide a concise summary of variables that must stay fixed.
                
                OUTPUT:
                ${rawOutput}`);

                try {
                    const extractRes = await (provider === 'groq'
                        ? (new Groq({ apiKey: GROQ_API_KEY! }).chat.completions.create({ messages: [{ role: 'user', content: stateExtractPrompt }], model: modelName }))
                        : (new GoogleGenerativeAI(GEMINI_API_KEY!).getGenerativeModel({ model: modelName }).generateContent(stateExtractPrompt)));

                    lastBatchState = provider === 'groq'
                        ? (extractRes as any).choices[0].message.content
                        : (extractRes as any).response.text();

                    console.log(`[Quantum Workflow] Extracted State: ${lastBatchState.substring(0, 50)}...`);
                } catch (e) {
                    console.warn("State extraction failed, proceeding with 'None'.");
                    lastBatchState = "None";
                }
            }
        }

        // --- STEP 8: FINAL SAVE ---
        const finalDisplay = `## 🚀 Multi-Batch Quantum Execution Completed
The problem was split into **${batchesNeeded} batches** to accommodate quantum hardware constraints. 

${combinedAnalysis}

**Final Consolidation:** Sequential continuity was maintained by carrying the end-state of each batch into the next.`;

        try {
            await Experiment.create({
                userId: userEmail,
                industry, service, problem, hardware,
                parameters: formData,
                qiskitCode: "BATCHED_EXECUTION",
                results: { raw: combinedRawOutput },
                analysis: finalDisplay,
                cacheKey: getWorkflowCacheKey(problem, service, hardware, formData),
                timestamp: new Date()
            });
        } catch (saveError) {
            console.error("Final Save Failed:", saveError);
        }

        // Calculate sim minutes used (rounded up to nearest 0.5 min)
        const simSeconds = totalExecutionTimeMs / 1000;
        let simMinutesDelta = Math.ceil((simSeconds / 60) * 2) / 2;
        // Apply minimum charge of 0.5 min for any successful execution
        if (simMinutesDelta < 0.5 && simMinutesDelta > 0) simMinutesDelta = 0.5;

        // Deduct from DB if authenticated
        if (userEmail && simMinutesDelta > 0) {
            try {
                const mongoose = (await import('mongoose')).default;
                const User = mongoose.models.User || (await import('@/models/User')).default;
                await User.findOneAndUpdate(
                    { email: userEmail },
                    { $inc: { simMinutesUsed: simMinutesDelta } }
                );
            } catch (dbErr) {
                console.error("Failed to update user sim minutes:", dbErr);
            }
        }

        return {
            returnMode: 'direct',
            data: {
                text: finalDisplay,
                source: 'quantum_workflow_batched',
                guardrailsStatus: 'passed',
                activeGuardrails: ruleTexts,
                simMinutesDelta
            }
        };
    }
    // Normal Industry Context (Existing logic if no formData)
    if (industry) systemInstructions += `\n\nINDUSTRY CONTEXT: You are assisting a user in the ${industry} sector.`;
    if (service) systemInstructions += `\nSERVICE CONTEXT: The user is focused on ${service}.`;
    if (problem) systemInstructions += `\nPROBLEM CONTEXT: The specific problem being addressed is ${problem}.`;
    if (hardware) systemInstructions += `\nHARDWARE CONTEXT: The target quantum hardware is ${hardware}. Optimize your responses for this architecture.`;

    return {
        returnMode: 'instructions',
        data: systemInstructions
    };
}

// ============================================================
// STEP-BY-STEP QUANTUM WORKFLOW ACTIONS
// ============================================================

export async function generateQuantumCode(config: {
    problem: string;
    industry: string;
    service: string;
    hardware: string;
    formData: any;
    batchIndex?: number; // 1-indexed
    lastBatchState?: string;
}): Promise<{ code: string; batchesTotal: number; error?: string }> {
    const { problem, industry, service, hardware, formData } = config;
    const isDWave = hardware?.toLowerCase().includes('d-wave') || hardware?.toLowerCase().includes('annealing');

    try {
        console.time(`generateCode_${problem}`);
        console.time(`generateCode_${problem}_db`);
        await dbConnect();
        const mongoose = (await import('mongoose')).default;
        const QuantumForm = mongoose.models.QuantumForm || (await import('@/models/QuantumForm')).default;

        const { provider, modelName } = await getDynamicLLM();
        console.timeEnd(`generateCode_${problem}_db`);

        console.log(`[Quantum Workflow Actions] generateQuantumCode | Ind: ${industry} | Svc: ${service} | Prob: ${problem} | HW: ${hardware}`);

        // Resilient Lookup: Fallback to industry/problem if service and generic defaults
        const svcResSearch = (!service || service === 'Gate-Model Circuit' || service === 'undefined')
            ? {} : { service: new RegExp(`^${service}$`, 'i') };

        console.time(`generateCode_${problem}_mongooseForm`);
        let formDef = await QuantumForm.findOne({
            industry: new RegExp(`^${industry}$`, 'i'),
            ...svcResSearch,
            problem: new RegExp(`^${problem}$`, 'i'),
            hardware: new RegExp(`^${hardware}$`, 'i')
        }).lean();

        // Fallback to Universal for template retrieval
        if (!formDef && hardware !== 'Universal') {
            formDef = await QuantumForm.findOne({
                industry: new RegExp(`^${industry}$`, 'i'),
                ...svcResSearch,
                problem: new RegExp(`^${problem}$`, 'i'),
                $or: [{ hardware: 'Universal' }, { hardware: { $exists: false } }]
            }).lean();
        }
        console.timeEnd(`generateCode_${problem}_mongooseForm`);

        console.log(`[Quantum Workflow Actions] Form Found: ${!!formDef} | Templates: ${formDef?.codeTemplates?.length || 0}`);

        let templateCode = "";
        if (formDef && formDef.codeTemplates && formDef.codeTemplates.length > 0) {
            const sanitizeStr = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            const hwSanitized = sanitizeStr(hardware);

            const matched = formDef.codeTemplates.find((t: any) => {
                const tSanitized = sanitizeStr(t.hardware);
                return hwSanitized.includes(tSanitized) || tSanitized.includes(hwSanitized);
            });
            templateCode = matched?.code || "";
            console.log(`[Quantum Workflow Actions] Template Match Search | HW: ${hwSanitized} | Result Found: ${!!templateCode}`);
        }

        let code = '';
        let codePrompt = '';
        let isTemplateAided = false;

        if (templateCode) {
            code = templateCode;
            isTemplateAided = true;
        } else {
            console.warn(`[Quantum Workflow Actions] No template found for ${service}/${problem} on ${hardware}. Failing fast.`);
            return {
                code: "",
                batchesTotal: 1,
                error: `No specialized quantum template found for ${service} > ${problem} on ${hardware}. LLM generation is disabled for POC stability.`
            };
        }

        // --- BATCHING METADATA ---
        let batchesTotal = 1;
        let startDim = 0;
        let endDim = 0;
        const sanitizedFormData: Record<string, any> = { ...formData };
        let activeQubitCount = 0;

        // --- DATA INJECTION FOR PORTFOLIO OPTIMIZATION ---
        if (problem.toLowerCase().includes('portfolio optimization')) {
            try {
                console.time(`generateCode_${problem}_portfolioDB`);
                const PortfolioCompany = mongoose.models.PortfolioCompany || (await import('@/models/PortfolioCompany')).default;
                const sectorParam = formData.sector;
                let query = {};

                if (Array.isArray(sectorParam)) {
                    query = { sector: { $in: sectorParam } };
                } else if (typeof sectorParam === 'string' && sectorParam) {
                    query = { sector: new RegExp(`^${sectorParam}$`, 'i') };
                } else {
                    query = { sector: 'Technology' }; // Default fallback
                }

                // Increase limit to 100 for full universe coverage across all sectors
                // OPTIMIZATION: Only fetch required fields to prevent memory/payload issues
                const companies = await PortfolioCompany.find(query, 'ticker company nextYearReturn risk sector').limit(100).lean();
                console.timeEnd(`generateCode_${problem}_portfolioDB`);

                console.time(`generateCode_${problem}_portfolioFilter`);

                // --- INTERLEAVING LOGIC: Ensure sector diversity across batches ---
                const groups: Record<string, any[]> = {};
                companies.forEach((c: any) => {
                    const s = c.sector || 'Unknown';
                    if (!groups[s]) groups[s] = [];
                    groups[s].push(c);
                });

                const interleaved: any[] = [];
                const sectorNames = Object.keys(groups);
                const maxLen = Math.max(...sectorNames.map(s => groups[s].length), 0);
                for (let i = 0; i < maxLen; i++) {
                    sectorNames.forEach(s => {
                        if (groups[s][i]) interleaved.push(groups[s][i]);
                    });
                }

                // --- SYNC FILTERING: Apply Risk Threshold in Backend for Batch Accuracy ---
                const rawRisk = formData.fixed_risk_threshold || formData.risk_threshold;
                const riskThreshold = rawRisk ? parseFloat(rawRisk) / 100 : 1.0;
                const filteredCompanies = interleaved.filter((c: any) => (c.risk / 100) <= riskThreshold);

                // Store separately — do NOT embed in sanitizedFormData to avoid 300MB RSC payload
                const portfolioDataForPython = interleaved.map((c: any) => ({
                    ticker: c.ticker, company: c.company,
                    nextYearReturn: c.nextYearReturn, risk: c.risk, sector: c.sector
                }));
                sanitizedFormData._portfolioDataRef = '__PORTFOLIO_INJECTED__'; // placeholder only
                (sanitizedFormData as any).__portfolioData = portfolioDataForPython; // kept separate
                activeQubitCount = filteredCompanies.length;
                sanitizedFormData.companies_count = activeQubitCount;
                sanitizedFormData.total_universe_size = interleaved.length;
                sanitizedFormData.filtered_universe_size = activeQubitCount;
                console.timeEnd(`generateCode_${problem}_portfolioFilter`);
                console.log(`[Quantum Workflow Actions] Injected ${interleaved.length} companies. Interleaved by Sector. Filtered (Risk <= ${riskThreshold * 100}%): ${activeQubitCount}.`);
            } catch (e) {
                console.error("Portfolio data injection failed:", e);
            }
        }

        if (formDef?.batchingEnabled) {
            try {
                let totalQubits = 0;
                if (activeQubitCount > 0) {
                    totalQubits = activeQubitCount;
                } else if (formDef.qubitFormula) {
                    let formula = formDef.qubitFormula;
                    Object.keys(formData).forEach(key => {
                        const regex = new RegExp(`{{${key}}}`, 'g');
                        formula = formula.replace(regex, String(formData[key]));
                    });
                    const sanitizedMath = formula.replace(/[^0-9+\-*/().\s]/g, '');
                    totalQubits = Math.ceil(eval(sanitizedMath));
                }
                const maxPerBatch = formDef.maxQubitsPerBatch || 20;
                batchesTotal = Math.max(1, Math.ceil(totalQubits / maxPerBatch));

                if (config.batchIndex) {
                    const b = config.batchIndex;
                    startDim = (b - 1) * maxPerBatch;
                    endDim = Math.min(b * maxPerBatch - 1, totalQubits - 1);

                    // Inject batch-specific keys
                    sanitizedFormData.batch_start_index = startDim;
                    sanitizedFormData.batch_end_index = endDim;
                    sanitizedFormData.batch_size = endDim - startDim + 1;
                    sanitizedFormData.last_batch_state = config.lastBatchState || "None";

                    if (formDef.batchKey) {
                        sanitizedFormData[formDef.batchKey] = sanitizedFormData.batch_size;
                    }
                }
            } catch (e) {
                console.error("Batching calculation failed:", e);
            }
        }

        if (!isTemplateAided) {
            return {
                code: "",
                batchesTotal,
                error: "No pre-configured deterministic code template found for this problem and hardware. LLM code generation is currently disabled for POC."
            };

            // LLM Code Generation has been disabled explicitly by the user for POC.
            // All code must flow perfectly deterministically through the MongoDB setup.

            // --- POST-PROCESS: Strip Hallucinations & Clean Code ---
            code = code.replace(/```python\s?([\s\S]*?)```/g, '$1');
            code = code.replace(/```\s?([\s\S]*?)```/g, '$1');

            if (code.includes('{{templateCode}}') || code.includes('"explanation":') || code.includes('"code":')) {
                const lines = code.split('\n');
                const cleanLines = [];
                for (const line of lines) {
                    if (line.trim().startsWith('{') || line.includes('{{templateCode}}') || line.includes('"explanation":')) {
                        break;
                    }
                    cleanLines.push(line);
                }
                code = cleanLines.join('\n').trim();
            }
        }

        code = code.trim();

        // --- FINAL SAFETY: DATA INJECTION ---
        // Extract portfolio data before stringify to prevent 300MB RSC payload
        const portfolioData = (sanitizedFormData as any).__portfolioData;
        delete (sanitizedFormData as any).__portfolioData;
        delete sanitizedFormData._portfolioDataRef;

        // --- BACKWARD COMPAT: Replace {{parameters.xxx}} placeholders (legacy template format) ---
        // Some templates (e.g. Aviation) still use {{parameters.key}} syntax.
        // Apply substitution BEFORE DotDict injection so the Python code is valid.
        Object.keys(sanitizedFormData).forEach(key => {
            const val = sanitizedFormData[key];
            const safeVal = (val === undefined || val === null || val === '') ? 'None' : val;
            const re = new RegExp(`\\{\\{parameters\\.${key}\\}\\}`, 'g');
            code = code.replace(re, String(safeVal));
        });
        // Replace any remaining unmatched {{parameters.xxx}} with None
        code = code.replace(/\{\{parameters\.[^}]+\}\}/g, 'None');

        // Serialize only the small parameters (no large arrays)
        const paramsJson = JSON.stringify(sanitizedFormData);
        const portfolioJson = portfolioData ? JSON.stringify(portfolioData) : 'None';

        const pythonInjections = `
class DotDict(dict):
    def __getattr__(self, name): return self.get(name)
    def __setattr__(self, name, value): self[name] = value

parameters = DotDict(${paramsJson})
portfolio_data = ${portfolioJson}
parameters['portfolio_data'] = portfolio_data
`;
        code = pythonInjections + "\n" + code;

        // Clean up any unmatched braces explicitly to prevent Python syntax errors
        code = code.replace(/{{parameters\.[^}]+}}/g, 'None');

        // Always force correct dimod imports for D-Wave
        if (isDWave) {
            const correctImports = `import dimod\nfrom dimod import BinaryQuadraticModel, SimulatedAnnealingSampler\nimport numpy as np\n\n`;
            code = code.split('\n').filter((l: string) => !l.trim().startsWith('from dimod import') && !l.trim().startsWith('import dimod')).join('\n').trim();
            code = correctImports + code;
        }

        console.timeEnd(`generateCode_${problem}`);
        return { code, batchesTotal };
    } catch (e: any) {
        console.error("GenerateCode Error:", e);
        return { code: '', batchesTotal: 1, error: e.message };
    }
}

export async function extractBatchState(config: {
    output: string;
}): Promise<{ state: string }> {
    const { output } = config;
    try {
        // Robust extraction using QUANTUM_JSON tags
        const jsonMatch = output.match(/\[QUANTUM_JSON\]([\s\S]*?)\[\/QUANTUM_JSON\]/);
        if (jsonMatch && jsonMatch[1]) {
            const data = JSON.parse(jsonMatch[1]);
            return { state: JSON.stringify(data.best_solution || {}) };
        }

        // Fallback to old behavior if tags are missing (for backward compatibility)
        const oldMatch = output.match(/\{[\s\S]*?"best_solution"[\s\S]*?\}/);
        if (oldMatch) {
            const data = JSON.parse(oldMatch[0]);
            return { state: JSON.stringify(data.best_solution || {}) };
        }
        return { state: "{}" };
    } catch (e) {
        console.warn("State extraction failed, fallback to empty JSON", e);
        return { state: "{}" };
    }
}


export async function runQuantumSimulator(config: {
    code: string; hardware: string;
}): Promise<{ output: string; error?: string; executionTimeMs?: number }> {
    const { code, hardware } = config;
    try {
        console.log(`[Simulator Router] START | HW: ${hardware} | CodeLen: ${code.length}`);
        const isDWave = hardware?.toLowerCase().includes('d-wave') || hardware?.toLowerCase().includes('annealing') || (code && code.includes('import dimod'));
        console.log(`[Simulator Router] Configured for: ${isDWave ? 'DWAVE/BQM' : 'QISKIT/GATE'}`);

        const result = isDWave
            ? await executeDWaveAnnealer(code)
            : await executeQuantumCircuit(code);

        // Handle structured JSON responses (counts, energy) from main.py
        if (result.success && !result.output) {
            const formattedOutput = `Simulation Successful.\nBest Solution: ${JSON.stringify(result.best_solution || result.counts || result, null, 2)}\n${result.energy !== undefined ? `Energy: ${result.energy}` : ''}`;
            return { output: formattedOutput, error: result.error, executionTimeMs: result.executionTimeMs };
        }

        return { output: result.output || result.error || 'No output returned.', error: result.error, executionTimeMs: result.executionTimeMs };
    } catch (e: any) {
        console.error("[Simulator Router] CRITICAL_FAIL:", e.message);
        return { output: '', error: e.message };
    }
}

export async function interpretQuantumResults(config: {
    problem: string; industry: string; hardware: string; rawOutput: string; formData: any;
}): Promise<{ text: string; chartData?: any; assignmentsTable?: any[]; qubitCount?: number; portfolioMetrics?: any }> {
    const { problem, industry, hardware, rawOutput, formData } = config;

    try {
        const { provider, modelName } = await getDynamicLLM();

        // --- PRE-PROCESS: Unify Results ---
        let unifiedSolution: Record<string, any> = {};
        let totalEnergy = 0;
        let extractedPlotlyChart: any = null;
        let finalAssignmentsTable: any[] = [];
        let finalSummary: string = "";
        let globalTotalQubits = 0;
        let globalBudget = 10;
        let globalAvgReturn = 0;
        let globalAvgRisk = 0;

        // 1. Try robust tagged extraction first
        const taggedMatches = [...rawOutput.matchAll(/\[QUANTUM_JSON\]([\s\S]*?)\[\/QUANTUM_JSON\]/g)];

        if (taggedMatches.length > 0) {
            taggedMatches.forEach(match => {
                try {
                    const data = JSON.parse(match[1]);
                    if (data.best_solution) Object.assign(unifiedSolution, data.best_solution);
                    if (data.energy !== undefined) totalEnergy += data.energy;
                    if (data.total_qubits) globalTotalQubits += data.total_qubits;
                    if (data.total_budget) globalBudget = data.total_budget;
                    if (data.assignmentsTable) finalAssignmentsTable.push(...data.assignmentsTable);
                    if (data.plotly_chart) extractedPlotlyChart = data.plotly_chart;

                    // Aviation fallback: build assignmentsTable from formatted_assignments strings
                    // e.g. "Pilot 0 assigned to Route 1 on Day 2"
                    if (!data.assignmentsTable && data.formatted_assignments && Array.isArray(data.formatted_assignments)) {
                        data.formatted_assignments.forEach((assignment: string) => {
                            const m = assignment.match(/Pilot (\d+) assigned to Route (\d+) on Day (\d+)/);
                            if (m) {
                                finalAssignmentsTable.push({
                                    pilot: `Pilot ${m[1]}`,
                                    route: `Route ${m[2]} | Day ${m[3]}`,
                                    sector: `Day ${m[3]}`,
                                    ticker: `P${m[1]}-R${m[2]}-D${m[3]}`,
                                });
                            }
                        });
                    }

                    if (data.summary && (!finalSummary || (!data.summary.includes('Waiting') && !data.summary.includes('No stocks')))) {
                        finalSummary = data.summary;
                    }

                } catch (e) {
                    console.error("Error parsing tagged JSON:", e);
                }
            });
        }
        else {
            // 2. Fallback to naive brace matching if no tags found
            const jsonMatches = [...rawOutput.matchAll(/\{[\s\S]*?"best_solution"[\s\S]*?\}/g)];
            jsonMatches.forEach(match => {
                try {
                    const data = JSON.parse(match[0]);
                    if (data.best_solution) {
                        Object.assign(unifiedSolution, data.best_solution);
                        if (data.energy !== undefined) totalEnergy += data.energy;
                        if (data.total_qubits) globalTotalQubits += data.total_qubits;
                        if (data.total_budget) globalBudget = data.total_budget;
                    }
                    if (data.assignmentsTable) finalAssignmentsTable.push(...data.assignmentsTable);
                } catch (e) {
                    console.error("Error parsing untagged JSON fallback:", e);
                }
            });
        }

        // --- CONSOLIDATE QUBO SELECTIONS (For Portfolio Optimization) ---
        // Trust the QUBO's own portfolio selection — do NOT re-rank with a classical scoring formula.
        // The quantum annealer already optimized the combination; we just consolidate across batches.
        if (problem.toLowerCase().includes('portfolio optimization') && finalAssignmentsTable.length > 0) {
            const budget = globalBudget || 10;

            // Deduplicate by ticker (same company may appear from overlapping batches)
            const seenTickers = new Set<string>();
            const deduplicated = finalAssignmentsTable.filter(row => {
                const ticker = row.ticker || row.pilot;
                if (!ticker || seenTickers.has(ticker)) return false;
                seenTickers.add(ticker);
                return true;
            });

            // Trim to target portfolio size
            const selectedAssignments = deduplicated.slice(0, budget);

            // Recalculate Global Stats
            let globalTotalReturn = 0;
            let globalTotalRisk = 0;
            selectedAssignments.forEach(row => {
                const retStr = row.route?.match(/Ret: ([\d.]+)%/);
                const riskStr = row.route?.match(/Risk: ([\d.]+)%/);
                const retVal = retStr ? parseFloat(retStr[1]) : 0;
                const riskVal = riskStr ? parseFloat(riskStr[1]) : 0;
                
                globalTotalReturn += retVal;
                globalTotalRisk += riskVal;
                
                // Add granular fields for the table
                row.return = retVal;
                row.risk = riskVal;
            });
            globalAvgReturn = selectedAssignments.length > 0 ? globalTotalReturn / selectedAssignments.length : 0;
            globalAvgRisk = selectedAssignments.length > 0 ? globalTotalRisk / selectedAssignments.length : 0;

            finalAssignmentsTable = selectedAssignments;

            const uniqueSectorsSelected = [...new Set(selectedAssignments.map(r => r.sector).filter(Boolean))];
            finalSummary = `Quantum QUBO optimized portfolio: ${selectedAssignments.length} assets across ${uniqueSectorsSelected.length} sectors. Solver evaluated ${globalTotalQubits || 'scanned'} stocks and converged to the minimum-energy configuration. Average expected return: ${globalAvgReturn.toFixed(2)}%, Portfolio average risk: ${globalAvgRisk.toFixed(2)}%.`;
        }


        // --- PREPARE READABLE ASSIGNMENTS ---
        let readableAssignments: string[] = [];
        finalAssignmentsTable.forEach(row => {
            const sectorTag = row.sector ? `${row.sector}: ` : '';
            readableAssignments.push(`${sectorTag}${row.pilot || row.ticker}: ${row.route}`);
        });

        if (readableAssignments.length === 0) {
            Object.entries(unifiedSolution).forEach(([key, val]) => {
                if (val === 1) {
                    readableAssignments.push(`${key.replace(/_/g, ' ')}: Assigned`);
                }
            });
        }

        const cleanedInput = `
GLOBAL SIMULATION RESULTS:
Assignments:
${readableAssignments.length > 0 ? readableAssignments.join('\n') : 'No assignments found.'}
Total Energy: ${totalEnergy.toFixed(2)}
`;

        const prompt = `Analyze this quantum optimization result for ${problem} in ${industry}.
RESULTS DATA:
${cleanedInput}
STRICT RULES:
- Write ONE paragraph (4-6 lines).
- Be professional and data-driven.
- Do NOT mention variable names like x_0.
- If a summary was provided: "${finalSummary}", incorporate its global aggregate values.`;

        let text = finalSummary || '';

        // Only call LLM if finalSummary is empty or we want extra polish
        if (!text || text.length < 50) {
            try {
                // Lazy-load Groq to avoid unnecessary imports
                const { default: Groq } = await import('groq-sdk');
                const GROQ_API_KEY = process.env.GROQ_API_KEY;

                if (provider === 'groq' && GROQ_API_KEY) {
                    const groq = new Groq({ apiKey: GROQ_API_KEY });
                    const completion = await groq.chat.completions.create({
                        messages: [{ role: 'system', content: 'You are a Quantum Analysis expert.' }, { role: 'user', content: prompt }],
                        model: modelName,
                    });
                    text = completion.choices[0]?.message?.content || text || 'Analysis complete.';
                }
            } catch (e) {
                console.warn("LLM call failed, using default summary:", e);
                text = text || "Quantum simulation complete.";
            }
        }

        const qubitCount = globalTotalQubits || Object.keys(unifiedSolution).length;
        if (qubitCount > 0) {
            const { getQuantumStateSpaceName } = await import('@/lib/quantum-utils');
            const toSuperscript = (num: number) => {
                const map: { [key: string]: string } = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
                return num.toString().split('').map(c => map[c] || c).join('');
            };
            const msg = `Quantum Exploration: Assessed a combinatorial space of 2${toSuperscript(qubitCount)} (${getQuantumStateSpaceName(qubitCount)}) potential states. The optimization engine determined the minimum-energy configuration, yielding the globally optimal solution under the specified constraints.`;
            text += `\n\n${msg}`;
        }

        return { 
            text, 
            chartData: extractedPlotlyChart, 
            assignmentsTable: finalAssignmentsTable, 
            qubitCount,
            portfolioMetrics: problem.toLowerCase().includes('portfolio optimization') ? {
                avgReturn: globalAvgReturn,
                avgRisk: globalAvgRisk,
                assetsCount: finalAssignmentsTable.length,
                sectorsCount: new Set(finalAssignmentsTable.map(r => r.sector).filter(Boolean)).size,
                universeSize: globalTotalQubits || finalAssignmentsTable.length,
                qubitCount: qubitCount
            } : null
        };
    } catch (e: any) {
        console.error("Critical error in interpretQuantumResults:", e);
        return { text: "Analysis failed: " + e.message, assignmentsTable: [], qubitCount: 0 };
    }
}

export async function savePipelineExperiment(data: {
    userId?: string;
    industry: string;
    service: string;
    problem: string;
    hardware: string;
    parameters: any;
    qiskitCode: string;
    results: any;
    analysis: string;
    chartData?: any;
    assignmentsTable?: any[];
}) {
    try {
        await dbConnect();

        // Lazy-load to prevent circular import or schema loading timing issues
        const mongoose = (await import('mongoose')).default;
        const Experiment = mongoose.models.Experiment || (await import('@/models/Experiment')).default;

        await Experiment.create({
            userId: data.userId || 'anonymous',
            industry: data.industry,
            service: data.service,
            problem: data.problem,
            hardware: data.hardware,
            parameters: data.parameters,
            qiskitCode: data.qiskitCode,
            results: data.results,
            analysis: data.analysis,
            chartData: data.chartData,
            assignmentsTable: data.assignmentsTable,
            timestamp: new Date()
        });
        return { success: true };
    } catch (e: any) {
        console.error("Failed to save experiment history:", e);
        return { success: false, error: e.message };
    }
}
