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
async function executeQuantumCircuit(circuitCode: string) {
    try {
        console.log(`[Quantum Sim] Sending request to: ${QISKIT_SERVICE_URL}/execute`);

        const response = await axios.post(`${QISKIT_SERVICE_URL}/execute`, {
            code: circuitCode
        }, {
            timeout: 20000
        });

        return response.data;
    } catch (e: any) {
        console.error("Simulator Execution Fail:", e.message);
        if (e.code === 'ECONNREFUSED') {
            return { error: "Qiskit Simulator is offline. Please ensure the Python service is running on Port 8001." };
        }
        return { error: `Quantum Service Error: ${e.message}` };
    }
}

async function executeDWaveAnnealer(code: string) {
    try {
        console.log(`[DWave Sim] Sending request to: ${DWAVE_SERVICE_URL}/execute`);

        const response = await axios.post(`${DWAVE_SERVICE_URL}/execute`, {
            code: code
        }, {
            timeout: 60000
        });

        return response.data;
    } catch (e: any) {
        console.error("D-Wave Execution Fail:", e.message);
        if (e.code === 'ECONNREFUSED') {
            return { error: "D-Wave Simulator is offline. Please ensure the Python service is running on Port 8002." };
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

        // --- STEP 3: MULTI-PASS GENERATION (Structured JSON) ---
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

        // --- STEP 6: FORMAT & SAVE ---
        const rawOutput = (finalExecutionResult.output || finalExecutionResult.error || 'No output.').trim();

        const parseAnyAssignmentTable = (out: string): string | null => {
            const bestMatch = out.match(/Best(?:\s+solution)?:\s*\{([^}]+)\}/i);
            if (!bestMatch) return null;
            const allPairs = [...bestMatch[1].matchAll(/'?([^':,\s]+)'?\s*:\s*([\w.+-]+)/g)];
            if (allPairs.length === 0) return null;
            const rows = allPairs.map(([, key, val]) => {
                const pilotFlight = key.match(/pilot[_\s]?(\w+)[_\s]flight[_\s]?(\w+)/i);
                const displayKey = pilotFlight ? `Pilot ${pilotFlight[1]} → Flight ${pilotFlight[2]}` : key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                const numVal = parseFloat(val);
                const displayVal = isNaN(numVal) ? val : numVal === 1 ? '✅ Assigned' : numVal === 0 ? '⬜ Not Assigned' : numVal.toFixed(4);
                return `| ${displayKey} | ${displayVal} |`;
            });
            const header = `| Variable | Value |\n|---|---|\n`;
            return `**⚙️ Simulator Output**\n\n${header}${rows.join('\n')}`;
        };

        const tableOutput = parseAnyAssignmentTable(rawOutput);
        const energyMatch = rawOutput.match(/Energy:\s*([-\d.]+)/i);
        const energyLine = energyMatch ? `\n\n> **Lowest Energy:** \`${energyMatch[1]}\`` : '';

        const formattedOutput = tableOutput
            ? `${tableOutput}${energyLine}\n\n---\n\n`
            : `**⚙️ Raw Simulator Output**\n\`\`\`\n${rawOutput}\n\`\`\`\n\n---\n\n`;

        const finalDisplay = `[STEP_CODE]${generatedCode}[/STEP_CODE]` +
            `[STEP_SIM]${rawOutput}[/STEP_SIM]` +
            formattedOutput +
            explanation;

        try {
            await Experiment.create({
                userId: userEmail,
                industry,
                service,
                problem,
                hardware,
                parameters: formData,
                qiskitCode: generatedCode,
                results: finalExecutionResult,
                analysis: finalDisplay,
                cacheKey: cacheKey, // Store the hash for future reuse
                chartData: finalExecutionResult.counts ? {
                    type: "bar",
                    data: Object.entries(finalExecutionResult.counts).map(([k, v]) => ({ name: k, value: v }))
                } : null,
                timestamp: new Date()
            });
        } catch (saveError) {
            console.error("Failed to save experiment history:", saveError);
        }

        return {
            returnMode: 'direct',
            data: {
                text: finalDisplay,
                source: 'quantum_workflow',
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
    problem: string; industry: string; service: string; hardware: string; formData: any;
}): Promise<{ code: string; error?: string }> {
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

        let codePrompt = '';
        let systemInstruction = 'You are a Quantum Expert. Return only Python code. No markdown. No explanation.';

        if (templateCode) {
            systemInstruction = 'You are a strict string substitution parser. Your ONLY job is to take the provided template, replace the placeholders, and return the modified code block. Do NOT rewrite, optimise, or change any logic. Return ONLY the final Python code. No markdown or explanation.';
            codePrompt = `TEMPLATE CODE:\n${templateCode}\n\nPARAMETERS:\n${JSON.stringify(formData)}\n\nINSTRUCTION: Fill the exact parameter values into the {{parameters.variableName}} placeholders. Ensure any values acting as loop dimensions are cast to int. Return ONLY the raw valid Python code without markdown blocks or reasoning.`;
        } else {
            if (isDWave) {
                codePrompt = `You are a Python expert using dimod 0.12.21. Generate a complete runnable script.
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
Return ONLY the Python code. No markdown. No backticks. No explanation.`;
            } else {
                codePrompt = `Generate a complete, self-contained Python Qiskit script.
Industry: ${industry} | Service: ${service} | Problem: ${problem} | Hardware: ${hardware}
Parameters: ${JSON.stringify(formData)}
Rules: Use qiskit and qiskit_aer. Build QuantumCircuit, add gates and measurements.
IMPORTANT: Ensure any parameter variables used for loop dimensions or counts are cast to strict integers.
Run: from qiskit_aer import AerSimulator; sim=AerSimulator(); job=sim.run(circuit,shots=1024); result=job.result(); counts=result.get_counts(); print(f"Results: {counts}")
Return ONLY the Python code. No markdown. No explanation.`;
            }
        }

        let code = '';
        if (provider === 'groq') {
            if (!GROQ_API_KEY) return { code: "", error: "Groq API Key is missing. Please add GROQ_API_KEY to environment variables." };
            const groq = new Groq({ apiKey: GROQ_API_KEY });
            const completion = await groq.chat.completions.create({
                messages: [{ role: 'system', content: systemInstruction }, { role: 'user', content: codePrompt }],
                model: modelName,
            });
            code = completion.choices[0]?.message?.content?.replace(/```python|```/g, '').trim() || '';
        } else {
            if (!GEMINI_API_KEY) return { code: "", error: "Gemini API Key is missing. Please add GEMINI_API_KEY to environment variables." };
            const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent([
                systemInstruction,
                codePrompt
            ]);
            code = result.response.text().replace(/```python|```/g, '').trim() || '';
        }

        // Always force correct dimod imports for D-Wave
        if (isDWave) {
            const correctImports = `from dimod import BinaryQuadraticModel, SimulatedAnnealingSampler\nimport numpy as np\n\n`;
            code = code.split('\n').filter((l: string) => !l.trim().startsWith('from dimod import') && !l.trim().startsWith('import dimod')).join('\n').trim();
            code = correctImports + code;
        }

        return { code };
    } catch (e: any) {
        return { code: '', error: e.message };
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
        const prompt = `You are a Quantum Computing analyst. Analyze the following ACTUAL simulator output ONLY.
Problem: ${problem} | Industry: ${industry} | Simulator: ${isDWave ? 'D-Wave Annealing' : 'Qiskit Gate-Model'}
Raw Output: ${rawOutput}
STRICT RULES:
- Write exactly ONE paragraph of 5-6 lines maximum.
- Only describe what the ACTUAL output data shows. Do NOT assume, speculate, or explain theory.
- If the output is an error, state only what the error was and what it means technically.
- Be direct and data-driven.
After the paragraph, generate a chart:
[CHART_DATA]
{ "type": "bar", "data": [ {"name": "Label from output", "value": 123} ] }
[/CHART_DATA]`;

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
        let chartData = null;
        if (text.includes("[CHART_DATA]")) {
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
