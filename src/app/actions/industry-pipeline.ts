"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-2.0-flash-lite";
import Groq from "groq-sdk";
import LLMSetting from '@/models/LLMSetting';
import dbConnect from '@/lib/db';
const GROQ_API_KEY = process.env.GROQ_API_KEY;

async function getDynamicLLM() {
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
    return { provider, modelName };
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
    try {
        const url = `${QISKIT_SERVICE_URL}/execute`;
        console.log(`[Quantum Sim] Sending request to: ${url}`);

        const response = await axios.post(url, {
            code: circuitCode
        }, {
            headers: { 'X-API-Key': API_SECRET },
            timeout: 20000
        });

        return response.data;
    } catch (e: any) {
        console.error("Simulator Execution Fail:", e.message);
        if (e.code === 'ECONNREFUSED') {
            return { error: "Qiskit Simulator is offline. Please ensure the Python service is running." };
        }
        return { error: `Quantum Service Error: ${e.message}` };
    }
}

async function executeDWaveAnnealer(code: string) {
    try {
        const url = `${DWAVE_SERVICE_URL}/execute`;
        console.log(`[DWave Sim] Sending request to: ${url}`);

        const response = await axios.post(url, {
            code: code
        }, {
            headers: { 'X-API-Key': API_SECRET },
            timeout: 60000
        });

        return response.data;
    } catch (e: any) {
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
        const formDef = await QuantumForm.findOne({
            industry: new RegExp(`^${industry}$`, 'i'),
            service: new RegExp(`^${service}$`, 'i'),
            problem: new RegExp(`^${problem}$`, 'i')
        }).lean();
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

            const isDWave = hardware.toLowerCase().includes('d-wave') || hardware.toLowerCase().includes('annealer');
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

                    console.log(`[Quantum Workflow] EXECUTED | Output length: ${finalExecutionResult.output?.length || 0}`);
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

        return {
            returnMode: 'direct',
            data: {
                text: finalDisplay,
                source: 'quantum_workflow_batched',
                guardrailsStatus: 'passed',
                activeGuardrails: ruleTexts
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
        await dbConnect();
        const mongoose = (await import('mongoose')).default;
        const QuantumForm = mongoose.models.QuantumForm || (await import('@/models/QuantumForm')).default;

        const { provider, modelName } = await getDynamicLLM();

        console.log(`[Quantum Workflow Actions] generateQuantumCode | Ind: ${industry} | Svc: ${service} | Prob: ${problem} | HW: ${hardware}`);

        const formDef = await QuantumForm.findOne({
            industry: new RegExp(`^${industry}$`, 'i'),
            service: new RegExp(`^${service}$`, 'i'),
            problem: new RegExp(`^${problem}$`, 'i')
        }).lean();

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
            if (isDWave) {
                codePrompt = await getDynamicPrompt('industry_dwave', {
                    problem,
                    industry,
                    service,
                    parameters: JSON.stringify(formData)
                }, `You are a Python expert using dimod 0.12.21. Generate a complete runnable script.
CRITICAL: The ONLY valid BinaryQuadraticModel constructor is:
  BinaryQuadraticModel(linear: dict, quadratic: dict, offset: float, vartype: str)
  DO NOT pass num_variables or any other argument.
Problem: ${problem} | Industry: ${industry} | Service: ${service}
Parameters: ${JSON.stringify(formData)}
Write a script that:
1. from dimod import BinaryQuadraticModel, SimulatedAnnealingSampler
2. Define linear={} and quadratic={} dicts. You may use UP TO 30 VARIABLES.
3. IMPORTANT: Ensure any variables from Parameters that refer to counts, days, shifts, or items are parsed as strict integers (e.g., int(x)) so they can be used safely in range() calls!
4. bqm = BinaryQuadraticModel(linear, quadratic, 0.0, 'BINARY')
   sampler = SimulatedAnnealingSampler(); sampleset = sampler.sample(bqm, num_reads=50)
   best = sampleset.first; print(f'Best: {best.sample}'); print(f'Energy: {best.energy:.4f}')
Return ONLY the Python code. No markdown. No backticks. No explanation.`);
            } else {
                codePrompt = await getDynamicPrompt('industry_qiskit', {
                    problem,
                    industry,
                    service,
                    hardware,
                    parameters: JSON.stringify(formData)
                }, `Generate a complete, self-contained Python Qiskit script.
Industry: ${industry} | Service: ${service} | Problem: ${problem} | Hardware: ${hardware}
Parameters: ${JSON.stringify(formData)}
Rules: Use qiskit and qiskit_aer. Build QuantumCircuit, add gates and measurements.
IMPORTANT: Ensure any parameter variables used for loop dimensions or counts are cast to strict integers.
Run: from qiskit_aer import AerSimulator; sim=AerSimulator(); job=sim.run(circuit,shots=1024); result=job.result(); counts=result.get_counts(); print(f"Results: {counts}")
Return ONLY the Python code. No markdown. No explanation.`);
            }
        }

        // --- BATCHING METADATA ---
        let batchesTotal = 1;
        let startDim = 0;
        let endDim = 0;
        const sanitizedFormData: Record<string, any> = { ...formData };

        if (formDef?.batchingEnabled && formDef.qubitFormula) {
            try {
                let formula = formDef.qubitFormula;
                Object.keys(formData).forEach(key => {
                    const regex = new RegExp(`{{${key}}}`, 'g');
                    formula = formula.replace(regex, String(formData[key]));
                });
                const sanitizedMath = formula.replace(/[^0-9+\-*/().\s]/g, '');
                const totalQubits = Math.ceil(eval(sanitizedMath));
                const maxPerBatch = formDef.maxQubitsPerBatch || 20;
                batchesTotal = Math.ceil(totalQubits / maxPerBatch);

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

        // --- FINAL SAFETY: HARD TEMPLATE SUBSTITUTION & INJECTION ---
        // 1. Hard Regex Substitution (Primary)
        Object.entries(sanitizedFormData).forEach(([key, val]) => {
            const bracedPlaceholder = new RegExp(`{{parameters\\.${key}}}`, 'g');
            const cleanPlaceholder = new RegExp(`parameters\\.${key}`, 'g');

            code = code.replace(bracedPlaceholder, String(val));
            // Also catch cases where LLM "helped" by removing braces but keeping the word 'parameters.'
            code = code.replace(cleanPlaceholder, String(val));
        });

        // 2. Python-Side Injection (Ultimate Fallback)
        const pythonInjections = `
class DotDict(dict):
    def __getattr__(self, name): return self.get(name)
    def __setattr__(self, name, value): self[name] = value

parameters = DotDict(${JSON.stringify(sanitizedFormData)})
`;
        code = pythonInjections + "\n" + code;

        // Clean up any remaining unmatched placeholders
        code = code.replace(/{{parameters\.[^}]+}}/g, 'None');


        // Always force correct dimod imports for D-Wave
        if (isDWave) {
            const correctImports = `import dimod\nfrom dimod import BinaryQuadraticModel, SimulatedAnnealingSampler\nimport numpy as np\n\n`;
            code = code.split('\n').filter((l: string) => !l.trim().startsWith('from dimod import') && !l.trim().startsWith('import dimod')).join('\n').trim();
            code = correctImports + code;
        }

        return { code, batchesTotal };
    } catch (e: any) {
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
}): Promise<{ output: string; error?: string }> {
    const { code, hardware } = config;
    const isDWave = hardware?.toLowerCase().includes('d-wave') || hardware?.toLowerCase().includes('annealing');

    try {
        const result = isDWave
            ? await executeDWaveAnnealer(code)
            : await executeQuantumCircuit(code);

        // Handle structured JSON responses (counts, energy) from main.py
        if (result.success && !result.output) {
            const formattedOutput = `Simulation Successful.\nBest Solution: ${JSON.stringify(result.best_solution || result.counts || result, null, 2)}\n${result.energy !== undefined ? `Energy: ${result.energy}` : ''}`;
            return { output: formattedOutput, error: result.error };
        }

        return { output: result.output || result.error || 'No output returned.', error: result.error };
    } catch (e: any) {
        return { output: '', error: e.message };
    }
}

export async function interpretQuantumResults(config: {
    problem: string; industry: string; hardware: string; rawOutput: string;
}): Promise<{ text: string; chartData?: any }> {
    const { problem, industry, hardware, rawOutput } = config;
    const isDWave = hardware?.toLowerCase().includes('d-wave') || hardware?.toLowerCase().includes('annealing');

    try {
        const { provider, modelName } = await getDynamicLLM();

        // --- PRE-PROCESS: Unify and De-Gibberish Multi-Batch Results ---
        let unifiedSolution: Record<string, any> = {};
        let totalEnergy = 0;
        let allFormattedAssignments: string[] = [];

        let extractedPlotlyChart: any = null;

        // 1. Try robust tagged extraction first
        const taggedMatches = [...rawOutput.matchAll(/\[QUANTUM_JSON\]([\s\S]*?)\[\/QUANTUM_JSON\]/g)];

        if (taggedMatches.length > 0) {
            taggedMatches.forEach(match => {
                try {
                    const data = JSON.parse(match[1]);
                    if (data.best_solution) Object.assign(unifiedSolution, data.best_solution);
                    if (data.energy !== undefined) totalEnergy += data.energy;
                    if (data.formatted_assignments) allFormattedAssignments.push(...data.formatted_assignments);
                    if (data.plotly_chart) extractedPlotlyChart = data.plotly_chart;
                } catch (e) {
                    console.warn("Failed to parse tagged JSON", e);
                }
            });
        } else {
            // 2. Fallback to naive brace matching if no tags found
            const jsonMatches = [...rawOutput.matchAll(/\{[\s\S]*?"best_solution"[\s\S]*?\}/g)];
            jsonMatches.forEach(match => {
                try {
                    const data = JSON.parse(match[0]);
                    if (data.best_solution) {
                        Object.assign(unifiedSolution, data.best_solution);
                    }
                    if (data.energy !== undefined) {
                        totalEnergy += data.energy;
                    }
                    if (data.formatted_assignments && Array.isArray(data.formatted_assignments)) {
                        allFormattedAssignments.push(...data.formatted_assignments);
                    }
                } catch (e) {
                    console.warn("Failed to parse legacy JSON during interpretation", e);
                }
            });
        }

        // Use formatted assignments if available, otherwise fallback to manual translation
        let readableAssignments: string[] = allFormattedAssignments;

        if (readableAssignments.length === 0) {
            Object.entries(unifiedSolution).forEach(([key, val]) => {
                if (val === 1) {
                    const match = key.match(/x_(\w+)_(\w+)(?:_(\w+))?/);
                    if (match) {
                        const [, p, r, d] = match;
                        let desc = `Pilot ${p} scheduled for Flight ${r}`;
                        if (d !== undefined) desc += ` on Day ${d}`;
                        readableAssignments.push(desc);
                    } else {
                        readableAssignments.push(`${key.replace(/_/g, ' ')}: Assigned`);
                    }
                }
            });
        }

        const cleanedInput = `
GLOBAL SIMULATION RESULTS (Unified from all batches):
Assignments:
${readableAssignments.length > 0 ? readableAssignments.join('\n') : 'No assignments found.'}
Total Energy: ${totalEnergy.toFixed(2)}
`;

        const prompt = await getDynamicPrompt('industry_analysis', {
            problem,
            industry,
            simulator: hardware,
            output: cleanedInput
        }, `You are a Quantum Computing analyst. Analyze this schedule generated by a D-Wave Quantum Annealer.
Problem: ${problem} | Industry: ${industry}

SCHEDULE DATA:
${cleanedInput}

STRICT RULES:
- Translate the data into a professional executive summary.
- Write exactly ONE paragraph of 5-6 lines maximum.
- Use names like "Route X" or "Pilot Y" based on the data.
- Mention if the total energy indicates a high-confidence stable solution.
- Be direct and data-driven.
- Do NOT use variable names like "x_0_0_0" in your final text.

After the paragraph, generate a chart showing assignment counts:
[CHART_DATA]
{ "type": "bar", "data": [ {"name": "Total Assignments", "value": ${readableAssignments.length}} ] }
[/CHART_DATA]`);

        let text = '';
        if (provider === 'groq') {
            if (!GROQ_API_KEY) return { text: "Analysis unavailable: Groq API Key is missing.", chartData: null };
            const groq = new Groq({ apiKey: GROQ_API_KEY });
            const completion = await groq.chat.completions.create({
                messages: [{ role: 'system', content: 'You are a Quantum Analysis expert.' }, { role: 'user', content: prompt }],
                model: modelName,
            });
            text = completion.choices[0]?.message?.content || 'Analysis complete.';
        } else {
            if (!GEMINI_API_KEY) return { text: "Analysis unavailable: Gemini API Key is missing.", chartData: null };
            const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent([
                "You are a Quantum Analysis expert.",
                prompt
            ]);
            text = result.response.text() || 'Analysis complete.';
        }
        let chartData = extractedPlotlyChart || null;
        if (!chartData && text.includes("[CHART_DATA]")) {
            const chartMatch = text.match(/\[CHART_DATA\]\n([\s\S]*?)\n\[\/CHART_DATA\]/);
            if (chartMatch && chartMatch[1]) {
                try {
                    chartData = JSON.parse(chartMatch[1]);
                    text = text.replace(chartMatch[0], "").trim();
                } catch (e: any) {
                    console.error("Chart JSON Parse Error:", e);
                }
            }
        }

        const qubitCount = Object.keys(unifiedSolution).length;
        if (qubitCount > 0) {
            const toSuperscript = (num: number) => {
                const map: { [key: string]: string } = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
                return num.toString().split('').map(c => map[c] || c).join('');
            };
            const msg = `Explored a combinatorial space of 2${toSuperscript(qubitCount)} scenarios and converged to a minimum-energy configuration representing the optimal solution.`;
            text += `\n\n*✨ ${msg}*`;
        }

        return { text, chartData };
    } catch (e: any) {
        return { text: "Analysis failed due to error: " + e.message, chartData: null };
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
            timestamp: new Date()
        });
        return { success: true };
    } catch (e: any) {
        console.error("Failed to save experiment history:", e);
        return { success: false, error: e.message };
    }
}
