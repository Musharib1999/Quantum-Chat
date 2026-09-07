"use server";

import axios from 'axios';
import * as cheerio from 'cheerio';
import dbConnect from '@/lib/db';
import mongoose from 'mongoose';
import QaPair from '@/models/QaPair';
import Guardrail from '@/models/Guardrail';
import ChatLog from '@/models/ChatLog';
import User from '@/models/User';
import SystemPrompt from '@/models/SystemPrompt';
import ChatSession from '@/models/ChatSession';
import { cookies } from 'next/headers';
import UserSession from '@/models/UserSession';
import SolvedProblem from '@/models/SolvedProblem';
import SystemLog from '@/models/SystemLog';
import crypto from 'crypto';
import { buildAssistantContext } from './assistant-pipeline';
import { buildArticleContext } from './article-pipeline';
import { getDynamicPrompt } from './prompt-utils';

function getPromptHash(text: string): string {
    const normalized = text.toLowerCase().trim().replace(/\s+/g, ' ');
    return crypto.createHash('sha256').update(normalized).digest('hex');
}

// --- Types ---
export interface AIResponse {
    text: string;
    sourceUrl?: string;
    form?: {
        id: string;
        title: string;
        fields: Array<{
            label: string;
            type: 'text' | 'number' | 'email' | 'select';
            options?: string[];
        }>;
    };
    source?: string;
    error?: string;
    guardrailsStatus?: string;
    activeGuardrails?: string[];
    tokensUsed?: number;
    sessionTokenLimit?: number;
    tokenLimitExceeded?: boolean;
    workflowSteps?: {
        nlp?: string;
        reasoner?: string;
        suggestor?: string;
        solver?: string;
        verifier?: string;
        dcc?: boolean;
        suggested_solver?: string;
        math_rigor?: any;
        classifier?: string;
    };
    executionResult?: any;
}

// --- Guardrails ---
const getActiveGuardrails = async () => {
    await dbConnect();
    const rules = await Guardrail.find({ active: true }).lean();
    return rules as any[];
};

const checkGuardrails = (prompt: string, rules: any[]): string | null => {
    for (const r of rules) {
        if (r.type === 'banned_topic' && prompt.toLowerCase().includes(r.rule.toLowerCase())) {
            return "I cannot answer this question due to safety guidelines regarding: " + r.rule;
        }
    }
    return null;
};

// --- Web Scraping Helper ---
export async function scrapeUrl(url: string) {
    try {
        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 10000
        });
        const $ = cheerio.load(data);
        $('script, style, nav, footer, iframe').remove();
        const pageText = $('body').text().replace(/\s+/g, ' ').trim().substring(0, 10000);
        return pageText;
    } catch (e) {
        console.error("Failed to fetch URL:", url);
        return null;
    }
}

// --- Knowledge Base ---
const queryKnowledgeBase = async (prompt: string) => {
    await dbConnect();
    const kbs = await QaPair.find({}).lean();

    const match = (kbs as any[]).find(kb =>
        prompt.toLowerCase().includes(kb.question.toLowerCase()) ||
        kb.question.toLowerCase().includes(prompt.toLowerCase())
    );

    if (match) {
        if (match.type === 'text') {
            return { type: 'direct', text: match.answer };
        }
        if (match.type === 'url') {
            const pageText = await scrapeUrl(match.answer);
            if (pageText) {
                return { type: 'context', text: pageText, source: match.answer };
            } else {
                return { type: 'url_only', sourceUrl: match.answer };
            }
        }
        if (match.type === 'form') {
            return {
                type: 'form',
                text: match.answer,
                form: match.formConfig
            };
        }
    }
    return null;
};

// --- Main Entry Point ---
// Function name kept for frontend compatibility (useQuantumChat hook imports this)
export async function chatWithQuantumAI(
    prompt: string,
    type: 'chat' | 'draft' = 'chat',
    lang: 'en' | 'hi' = 'en',
    contextConfig?: any
): Promise<AIResponse> {
    await dbConnect();

    // Securely fetch active user email from the HttpOnly session cookie
    const activeUserEmail = await getCurrentUserEmail();
    if (!activeUserEmail) {
        return {
            text: "⚠️ Unauthorized. Please log in.",
            source: 'system',
            guardrailsStatus: 'passed',
            activeGuardrails: [],
            tokensUsed: 0
        };
    }

    // Sanitize prompt
    const sanitizedPrompt = prompt.replace(/[{}]/g, '').trim();

    // 1. Token limit check
    if (activeUserEmail) {
        const user = await User.findOne({ email: activeUserEmail }).lean() as any;
        if (user && user.tokensUsed >= user.tokenLimit) {
            return {
                text: "⚠️ Your token limit has been reached. Please contact administration.",
                source: 'system',
                guardrailsStatus: 'passed',
                activeGuardrails: [],
                tokensUsed: user.tokensUsed,
                sessionTokenLimit: user.tokenLimit,
                tokenLimitExceeded: true
            };
        }
    }

    // 2. Fetch guardrails
    const guardrailRules = await getActiveGuardrails();
    const ruleTexts = guardrailRules.map((r: any) => r.rule);
    const guardrailBlock = checkGuardrails(sanitizedPrompt, guardrailRules);

    if (guardrailBlock) {
        await ChatLog.create({
            userQuery: sanitizedPrompt,
            aiResponse: guardrailBlock,
            source: 'blocked',
            guardrailsStatus: 'violated',
            activeGuardrails: ruleTexts,
            mode: contextConfig?.mode || 'assistant'
        });
        return {
            text: guardrailBlock,
            source: 'blocked',
            guardrailsStatus: 'violated',
            activeGuardrails: ruleTexts,
            tokensUsed: 0
        };
    }

    // 3. Knowledge Base check (applies to all modes)
    const kbResult = await queryKnowledgeBase(sanitizedPrompt);
    if (kbResult) {
        if (kbResult.type === 'direct') {
            await ChatLog.create({
                userQuery: sanitizedPrompt,
                aiResponse: kbResult.text,
                source: 'direct',
                guardrailsStatus: 'passed',
                activeGuardrails: ruleTexts,
                mode: 'kb_direct'
            });
            return {
                text: kbResult.text,
                source: 'direct',
                guardrailsStatus: 'passed',
                activeGuardrails: ruleTexts,
                tokensUsed: 0
            };
        }
        if (kbResult.type === 'form') {
            return {
                text: kbResult.text,
                form: kbResult.form as any,
                source: 'form',
                guardrailsStatus: 'passed',
                activeGuardrails: ruleTexts,
                tokensUsed: 0
            };
        }
    }

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8002';

    // 4. Article mode — arXiv context injection, then RunPod Qwen
    if (contextConfig?.mode === 'article') {
        const articleDeps = { getDynamicPrompt, scrapeUrl };
        const articleResult = await buildArticleContext(contextConfig, articleDeps);
        const systemInstructions = articleResult.systemInstructions;

        const backendRes = await axios.post(`${backendUrl}/v2/chat`, {
            message: sanitizedPrompt,
            system_prompt: systemInstructions
        });
        const responseText = backendRes.data?.response || "No response from engine.";

        await ChatLog.create({
            userQuery: sanitizedPrompt,
            aiResponse: responseText,
            source: 'direct_qwen',
            guardrailsStatus: 'passed',
            activeGuardrails: ruleTexts,
            mode: 'article'
        });

        return {
            text: responseText,
            source: 'direct_qwen',
            guardrailsStatus: 'passed',
            activeGuardrails: ruleTexts,
            tokensUsed: 0
        };
    }

    // 5. Assistant mode — three pipelines routed by selectedPipeline
    if (!contextConfig?.mode || contextConfig?.mode === 'assistant') {

        // Inject structured file data if uploaded
        let finalPrompt = sanitizedPrompt;
        if (contextConfig?.attachedData) {
            const ad = contextConfig.attachedData;
            const dataBlock = [
                `[STRUCTURED DATA UPLOADED: ${ad.source_name || 'user_file'}]`,
                `Columns (${ad.col_count}): ${ad.columns?.join(', ')}`,
                `Total rows: ${ad.row_count}`,
                `Sample rows (first 10):`,
                JSON.stringify(ad.rows?.slice(0, 10), null, 2),
                ad.warnings?.length ? `Warnings: ${ad.warnings.join('; ')}` : '',
                `[END STRUCTURED DATA]`
            ].filter(Boolean).join('\n');
            finalPrompt = `${dataBlock}\n\nUser Instruction: ${finalPrompt}`;
        }

        try {
            const pipelineIntent = contextConfig?.selectedPipeline || 'general';

            // Retrieve and format recent conversation history for context (except optimization)
            let historyContext = "";
            if (pipelineIntent !== 'optimization' && contextConfig?.sessionId && mongoose.isValidObjectId(contextConfig.sessionId)) {
                const session = await ChatSession.findById(contextConfig.sessionId).lean() as any;
                if (session && session.messages && session.messages.length > 0) {
                    // Limit strictly to the last 4 messages (2 full turns) to minimize token consumption
                    const recent = session.messages.slice(-4);
                    historyContext = recent.map((m: any) => {
                        const senderName = m.sender === 'user' ? 'User' : 'Assistant';
                        return `[${senderName}]: ${m.text}`;
                    }).join('\n\n');
                }
            }

            if (historyContext) {
                finalPrompt = `Below is the recent conversation history for context:\n\n${historyContext}\n\n---\n\nUser Latest Query: ${finalPrompt}`;
            }


            // Pipeline 0: Quantum Chemistry Studio (PySCF + OpenFermion VQE)
            if (pipelineIntent === 'chemistry') {
                const chemRes = await axios.post(`${backendUrl}/v3/enterprise/chemistry/solve`, {
                    user_prompt: sanitizedPrompt,
                    representation: "smiles",
                    smiles_string: sanitizedPrompt,
                    basis: "sto-3g",
                    ansatz: "realamplitudes"
                });

                const manifest = chemRes.data?.manifest || {};
                const formattedResponse = `### Quantum Chemistry Experiment Manifest (CAS Active Space)

**Identified Molecule:** \`${manifest.formula || 'Custom Molecule'}\`  
**Atomic Elements:** \`${manifest.identified_elements || 'H'}\`  
**3D Cartesian Coordinates:** \`${manifest.molecule_name || ''}\`  
**Active Qubits Allocated:** \`${manifest.num_qubits || 2} Qubits\`  
**Electron Partitioning:** \`Total: ${manifest.total_electrons || 2} | Frozen: ${manifest.frozen_electrons || 0} | Active: ${manifest.active_electrons || 2}\`  
**Orbital Partitioning:** \`Spatial: ${manifest.active_spatial_orbitals || 2} Active (${manifest.total_spatial_orbitals || 2} Total) | Spin: ${manifest.active_spin_orbitals || 4} Spin Orbitals\`  

---

#### Energy Accounting & Baseline Comparison
* **Nuclear Repulsion Energy ($E_{nuc}$):** \`${manifest.nuclear_repulsion_energy} Ha\`
* **Frozen Core Potential ($E_{core}$):** \`${manifest.frozen_core_energy} Ha\`
* **Full-System Hartree-Fock Energy:** \`${manifest.hartree_fock_energy_hartree} Ha\`
* **Active-Space CASCI Reference Energy:** \`${manifest.fci_reference_hartree} Ha\`
* **Active-Space Qubit Exact Ground Energy:** \`${manifest.e_qubit_exact} Ha\`
* **VQE Calculated Reconstructed Energy:** \`${manifest.vqe_energy_hartree} Ha\` (\`${manifest.vqe_energy_ev} eV\`)
* **VQE Optimization Residual:** \`${manifest.vqe_vs_exact_error_mha} mHa\` (\`${manifest.absolute_error_ev} eV\`)
* **Chemical Accuracy Status (< 1.6 mHa):** ${manifest.chemical_accuracy_achieved ? '**Chemical Accuracy Reached**' : '**Convergence Benchmark Ongoing**'}

---

#### Visual Quantum Circuit (Qiskit Ansatz)
\`\`\`text
${manifest.circuit_diagram || ''}
\`\`\`

---

#### Deterministic Qiskit Code Template
\`\`\`python
${manifest.ansatz_qiskit_code}
\`\`\`
`;

                return {
                    text: formattedResponse,
                    source: 'chemistry_engine',
                    guardrailsStatus: 'passed',
                    activeGuardrails: ruleTexts,
                    tokensUsed: 0,
                    executionResult: {
                        executionTime: 1.2,
                        qubitsAllocated: manifest.num_qubits,
                        ansatzType: manifest.ansatz_type,
                        fciEnergy: manifest.fci_reference_hartree,
                        vqeEnergy: manifest.vqe_energy_hartree,
                        convergenceHistory: manifest.convergence_history
                    }
                };
            }

            // Pipeline QML: Quantum Machine Learning Studio (Automated Feasibility, Classical Baseline First, QSVM & VQC)
            if (pipelineIntent === 'qml') {
                const lowerPrompt = sanitizedPrompt.toLowerCase();
                const isPredictionIntent = lowerPrompt.includes('predict') || 
                                           lowerPrompt.includes('test sample') || 
                                           lowerPrompt.includes('inference') || 
                                           /\b\[[\d.,\s-]+\]\b/.test(sanitizedPrompt) || 
                                           /\b[a-zA-Z_]+=[\d.]+\b/.test(sanitizedPrompt);

                if (isPredictionIntent) {
                    // Extract numbers from array or key-value pairs
                    let extractedFeatures: number[] = [];
                    const arrayMatch = sanitizedPrompt.match(/\[([\d.,\s-]+)\]/);
                    if (arrayMatch) {
                        extractedFeatures = arrayMatch[1].split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
                    } else {
                        const numMatches = sanitizedPrompt.match(/[-+]?[0-9]*\.?[0-9]+/g);
                        if (numMatches && numMatches.length > 0) {
                            extractedFeatures = numMatches.map(n => parseFloat(n));
                        }
                    }

                    // Infer dataset context from prompt or conversation
                    let targetDataset = "Iris";
                    if (lowerPrompt.includes('cancer') || lowerPrompt.includes('breast')) targetDataset = "Breast Cancer";
                    else if (lowerPrompt.includes('churn') || lowerPrompt.includes('customer')) targetDataset = "Customer Churn";
                    else if (lowerPrompt.includes('wine')) targetDataset = "Wine";
                    else if (historyContext.toLowerCase().includes('cancer')) targetDataset = "Breast Cancer";
                    else if (historyContext.toLowerCase().includes('churn')) targetDataset = "Customer Churn";
                    else if (historyContext.toLowerCase().includes('wine')) targetDataset = "Wine";

                    const predRes = await axios.post(`${backendUrl}/v3/enterprise/qml/predict`, {
                        dataset_name: targetDataset,
                        user_prompt: sanitizedPrompt,
                        features: extractedFeatures.length > 0 ? extractedFeatures : undefined
                    });

                    const pred = predRes.data?.prediction || {};
                    const classical = pred.classical_prediction || {};
                    const qsvm = pred.qsvm_prediction || {};
                    const vqc = pred.vqc_prediction || {};

                    const formattedPredResponse = `### 🧪 Live Quantum ML Model Inference Result

**Active Model Context:** \`${pred.dataset_name || targetDataset}\`  
**Input Features:** \`${JSON.stringify(pred.raw_input_features || {})}\`  
**Quantum Phase Encoded Angles ($[0, \pi]$):** \`[${pred.quantum_phase_angles?.join(', ') || ''}]\`  
**Active Qubits Allocated:** \`${pred.active_qubits || 4} Qubits\`

---

#### 1. Dual Quantum vs Classical Model Predictions
* **Classical Baseline (${classical.model || 'Random Forest'}):** **Class ${classical.predicted_class}** (\`${classical.confidence_pct}%\` Confidence)
* **Quantum Kernel Classifier (QSVM):** **Class ${qsvm.predicted_class}** (\`${qsvm.confidence_pct}%\` Confidence, Kernel Alignment: \`${qsvm.kernel_alignment}\`)
* **Variational Quantum Classifier (VQC):** **Class ${vqc.predicted_class}** (Expectation $\langle Z_0 \rangle$: \`${vqc.expectation_value}\`, State Probability: \`${vqc.state_probability_pct}%\`)

---

#### 2. Inference Consensus & Analysis
* **Model Agreement:** **${pred.consensus === 'Unanimous' ? '✅ Unanimous Agreement' : '⚠️ Divergent Predictions'}**
* **Quantum State Signature:** Both quantum algorithms evaluated the statevector $|\psi(x)\rangle$ across $2^{${pred.active_qubits || 4}} = ${Math.pow(2, pred.active_qubits || 4)}$ Hilbert space dimensions to formulate classification decision boundaries.
`;

                    return {
                        text: formattedPredResponse,
                        source: 'qml_engine',
                        guardrailsStatus: 'passed',
                        activeGuardrails: ruleTexts,
                        tokensUsed: 0,
                        executionResult: {
                            executionTime: 0.15,
                            qubitsAllocated: pred.active_qubits || 4,
                            ansatzType: 'Live Inference',
                            fciEnergy: classical.confidence_pct,
                            vqeEnergy: qsvm.confidence_pct,
                            convergenceHistory: []
                        }
                    };
                }
                const qmlRes = await axios.post(`${backendUrl}/v3/enterprise/qml/solve`, {
                    user_prompt: sanitizedPrompt,
                    dataset_name: sanitizedPrompt,
                    task: "classification",
                    max_qubits: 4
                });

                const manifest = qmlRes.data?.manifest || {};
                const profile = manifest.data_profile || {};
                const baseline = manifest.classical_baseline || {};
                const qsvm = manifest.quantum_kernel_svm || {};
                const vqc = manifest.vqc_model || {};

                const formattedResponse = `### Quantum Machine Learning (QML) Experiment Manifest

**Dataset Profile:** \`${manifest.dataset_name || 'Standard Benchmark'}\`  
**Identified Task:** \`${manifest.task_type?.toUpperCase() || 'CLASSIFICATION'}\`  
**Detected Features:** \`${manifest.features_detected?.join(', ') || 'N/A'}\`  
**QML Feasibility & Reduction:** \`Original Features: ${profile.original_features || 4} ➔ Active Qubits: ${profile.active_qubits || 4} (${profile.pca_variance_preserved || 100}% PCA Variance Preserved)\`  
**Dataset Scale:** \`${profile.total_samples || 150} Total Samples (${profile.train_samples || 112} Train / ${profile.test_samples || 38} Test)\`

---

#### 1. Mandatory Classical Baseline
* **Logistic Regression Accuracy:** \`${baseline.logistic_regression_accuracy || 'N/A'}%\` (${baseline.logistic_regression_time_ms || 0} ms)
* **Support Vector Machine (RBF) Accuracy:** \`${baseline.svm_rbf_accuracy || 'N/A'}%\` (${baseline.svm_rbf_time_ms || 0} ms)
* **Random Forest Classifier Accuracy:** \`${baseline.random_forest_accuracy || 'N/A'}%\` (${baseline.random_forest_time_ms || 0} ms)
* **Best Classical Model:** **${baseline.best_classical_model || 'Random Forest'}** (\`${baseline.best_classical_accuracy || 'N/A'}%\`)

---

#### 2. Quantum Models Benchmark
* **Quantum Kernel Classifier (QSVM):** \`${qsvm.accuracy || 'N/A'}%\` (${qsvm.training_time_sec || 0}s, ${qsvm.kernel_evaluations || 0} Kernel Evaluations)
* **Variational Quantum Classifier (VQC):** \`${vqc.accuracy || 'N/A'}%\` (${vqc.training_time_sec || 0}s, Final Loss: \`${vqc.final_loss || 'N/A'}\`)
* **Best QML Accuracy:** \`${manifest.best_quantum_accuracy || 'N/A'}%\`
* **Performance Delta (QML vs Classical):** \`${manifest.accuracy_delta >= 0 ? '+' : ''}${manifest.accuracy_delta}%\`
* **Scientific Verdict:** **${manifest.advantage_status || 'Parity Achieved'}**

---

#### 3. Visual Quantum Circuit Architecture
\`\`\`text
${manifest.circuit_diagram || ''}
\`\`\`

---

#### 4. 🧪 Try Live Quantum Model Inference
You can immediately test predictions with this trained QML model! Send a new chat message with custom values:
* **Test Sample Array:** \`Predict for [5.1, 3.5, 1.4, 0.2]\`
* **Test by Feature Values:** \`Predict for Tenure=48, Monthly_Charges=75, Support_Tickets=1\`
* **Or simply ask:** \`Test a prediction on a sample\`

---

#### 5. Deterministic Qiskit Code Template
\`\`\`python
${manifest.ansatz_qiskit_code}
\`\`\`
`;

                return {
                    text: formattedResponse,
                    source: 'qml_engine',
                    guardrailsStatus: 'passed',
                    activeGuardrails: ruleTexts,
                    tokensUsed: 0,
                    executionResult: {
                        executionTime: (qsvm.training_time_sec || 0.5) + (vqc.training_time_sec || 0.5),
                        qubitsAllocated: profile.active_qubits || 4,
                        ansatzType: 'RealAmplitudes + ZZFeatureMap',
                        fciEnergy: baseline.best_classical_accuracy,
                        vqeEnergy: manifest.best_quantum_accuracy,
                        convergenceHistory: vqc.convergence_history || []
                    }
                };
            }

            // Pipeline 1: Business problem → Optimization (8-agent solver)
            if (pipelineIntent === 'optimization') {
                const promptHash = getPromptHash(finalPrompt);

                // Cache bypassed for testing variant 2 backend
                const disableCache = true;
                if (!disableCache) {
    // Exact Match Cache Lookup
                    const cachedProblem = await SolvedProblem.findOne({ promptHash });
                    if (cachedProblem) {
                        console.log(`[Cache Hit] Serving optimization result from cache for hash: ${promptHash}`);
                        await SystemLog.create({
                            service: "frontend",
                            logType: "info",
                            userId: contextConfig?.userEmail || null,
                            message: `[Cache Hit] Serviced exact match optimization result for prompt hash: ${promptHash}`,
                            metadata: { promptHash }
                        }).catch(err => console.error("Logging failed:", err));
                        
                        // Create chat log for visibility
                        await ChatLog.create({
                            userQuery: finalPrompt,
                            aiResponse: cachedProblem.response,
                            source: 'ai_engine_pipeline_cached',
                            guardrailsStatus: 'passed',
                            activeGuardrails: ruleTexts,
                            systemPrompt: 'Served from optimization cache',
                            mode: 'optimization'
                        });
    
                        return {
                            text: cachedProblem.response,
                            source: 'ai_engine_pipeline_cached',
                            guardrailsStatus: 'passed',
                            activeGuardrails: ruleTexts,
                            tokensUsed: 0,
                            workflowSteps: cachedProblem.workflowSteps
                        };
                    }
    
                    // 2. Semantic Match Check via Keyword Overlap (Fallback)
                    const stopwords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'of', 'to', 'for', 'in', 'on', 'at', 'by', 'with', 'from', 'we', 'our', 'us', 'i', 'my', 'how', 'what', 'why', 'where', 'when', 'who', 'which', 'and', 'or', 'but', 'so', 'it', 'this', 'that', 'these', 'those']);
                    const tokenize = (text: string) => {
                        return text.toLowerCase()
                            .replace(/[^\w\s]/g, '')
                            .split(/\s+/)
                            .filter(word => word.length > 2 && !stopwords.has(word));
                    };
    
                    const currentTokens = tokenize(finalPrompt);
                    if (currentTokens.length > 2) {
                        const allSolved = await SolvedProblem.find({}).lean() as any[];
                        for (const solved of allSolved) {
                            const solvedTokens = tokenize(solved.originalPrompt);
                            if (solvedTokens.length === 0) continue;
    
                            const intersection = currentTokens.filter(token => solvedTokens.includes(token));
                            const similarity = intersection.length / Math.max(currentTokens.length, solvedTokens.length);
    
                            if (similarity >= 0.88) { // 88% similarity threshold
                                console.log(`[Semantic Cache Hit] Match found: "${solved.originalPrompt}" (similarity: ${(similarity * 100).toFixed(1)}%)`);
                                await SystemLog.create({
                                    service: "frontend",
                                    logType: "info",
                                    userId: contextConfig?.userEmail || null,
                                    message: `[Semantic Cache Hit] Serviced semantic match (similarity: ${(similarity * 100).toFixed(1)}%) for prompt: "${solved.originalPrompt}"`,
                                    metadata: { similarity, matchedPrompt: solved.originalPrompt }
                                }).catch(err => console.error("Logging failed:", err));
    
                                await ChatLog.create({
                                    userQuery: finalPrompt,
                                    aiResponse: solved.response,
                                    source: 'ai_engine_pipeline_semantic_cached',
                                    guardrailsStatus: 'passed',
                                    activeGuardrails: ruleTexts,
                                    systemPrompt: `Served from semantic cache (${(similarity * 100).toFixed(0)}% match)`,
                                    mode: 'optimization'
                                });
    
                                return {
                                    text: solved.response,
                                    source: 'ai_engine_pipeline_semantic_cached',
                                    guardrailsStatus: 'passed',
                                    activeGuardrails: ruleTexts,
                                    tokensUsed: 0,
                                    workflowSteps: solved.workflowSteps
                                };
                            }
                        }
                    }
    
    
                }

                await SystemLog.create({
                    service: "frontend",
                    logType: "info",
                    userId: contextConfig?.userEmail || null,
                    message: `[Cache Miss] Routing optimization request to API Gateway`,
                    metadata: { endpoint: "/enterprise/pipeline" }
                }).catch(err => console.error("Logging failed:", err));

                const backendRes = await axios.post(`${backendUrl}/enterprise/pipeline`, {
                    unstructured_problem: finalPrompt,
                    mode: "auto",
                    penalty_choice: contextConfig?.penalty_choice ?? 3
                }, { timeout: 300000 }); // 5 min — pipeline can take 2-3 min with Qwen
                const data = backendRes.data;
                
                await SystemLog.create({
                    service: "frontend",
                    logType: "info",
                    userId: contextConfig?.userEmail || null,
                    message: `[Success] Optimization request compiled successfully`,
                    metadata: { hasCode: !!data.final_code }
                }).catch(err => console.error("Logging failed:", err));

                const visibleText = data.personality_response || data.reasoning_trace || "";
                const codeBlock = data.final_code ? `\n\n\`\`\`python\n${data.final_code}\n\`\`\`` : "";
                let responseText = visibleText + codeBlock;
                if (!responseText.trim()) {
                    responseText = "⚠️ The optimization pipeline completed but generated an empty response. Check backend logs.";
                }

                const compilerMetrics = data.compiler_metrics || {};
                const qMatrixPreview = data.q_matrix_preview || "";
                
                // Parse Q-matrix dimension and non-zero entries from preview text
                let q_size = compilerMetrics.q_size || 0;
                let q_nnz = compilerMetrics.q_nnz || 0;
                
                const dimMatch = qMatrixPreview.match(/Dimension\D*(\d+)x/i);
                if (dimMatch) {
                    q_size = parseInt(dimMatch[1]);
                }
                const nnzMatch = qMatrixPreview.match(/Non-zero\D*(\d+)/i);
                if (nnzMatch) {
                    q_nnz = parseInt(nnzMatch[1]);
                }

                const decision_vars_count = data.optimization_stats?.binary_variables || 0;
                const slack_vars_count = Math.max(0, q_size - decision_vars_count);
                const matrix_density = q_size > 0 ? parseFloat(((q_nnz / (q_size * q_size)) * 100).toFixed(2)) : 0.0;

                const workflowSteps = {
                    nlp: data.problem_specification ? JSON.stringify(data.problem_specification) : (data.parsed_math || "Parsed successfully"),
                    reasoner: data.reasoning_trace || "Feasibility check passed",
                    suggestor: `Suggested Solver: ${data.suggested_solver}\nRationale: ${data.solver_rationale || 'Optimal choice based on constraints'}`,
                    solver: "Generated Python optimization code",
                    verifier: data.success ? "Passed validation" : "Validation failed",
                    suggested_solver: data.suggested_solver,
                    dcc: !data.success,
                    math_rigor: data.math_rigor || {},
                    classifier: data.pattern || "Selection Optimization",
                    q_matrix_preview: data.q_matrix_preview || "",
                    final_code: data.final_code || "",
                    
                    // Added for Optimization Studio right sidebar live status mapping
                    optimization_stats: {
                        q_size: q_size,
                        q_nnz: q_nnz,
                        penalty_label: data.optimization_stats?.penalty_label || data.compiler_metrics?.penalty_label || "Proposed Penalty 3 (Verma-Lewis)",
                        penalty_weight: typeof data.optimization_stats?.penalty_weight === "number" ? data.optimization_stats.penalty_weight : (typeof data.compiler_metrics?.penalty_weight === "number" ? data.compiler_metrics.penalty_weight : 2.0),
                        decision_vars_count: decision_vars_count,
                        slack_vars_count: slack_vars_count,
                        matrix_density: matrix_density,
                        certificate_status: "ACTIVE_FAST_PATH"
                    },
                    parsingStatus: 'done',
                    qMatrixStatus: data.final_code ? 'done' : 'pending',
                    quboCodeStatus: data.final_code ? 'done' : 'pending',
                    simulatorStatus: 'pending',
                    outputStatus: 'pending'
                };

                // Populate Cache
                try {
                    await SolvedProblem.create({
                        promptHash,
                        normalizedPrompt: finalPrompt.toLowerCase().trim().replace(/\s+/g, ' '),
                        originalPrompt: finalPrompt,
                        response: responseText,
                        workflowSteps
                    });
                    console.log(`[Cache Populate] Saved optimization result for hash: ${promptHash}`);
                } catch (cacheErr) {
                    console.error("Failed to populate cache:", cacheErr);
                }

                await ChatLog.create({
                    userQuery: finalPrompt,
                    aiResponse: responseText,
                    source: 'ai_engine_pipeline',
                    guardrailsStatus: 'passed',
                    activeGuardrails: ruleTexts,
                    systemPrompt: 'Routed to optimization pipeline',
                    mode: 'optimization'
                });

                return {
                    text: responseText,
                    source: 'ai_engine_pipeline',
                    guardrailsStatus: 'passed',
                    activeGuardrails: ruleTexts,
                    tokensUsed: 0,
                    workflowSteps
                };
            }

            // Direct Qwen 32B on RunPod
            let sysPrompt = "You are the Quantum Guru, an expert quantum assistant. Answer clearly and accurately.";
            if (pipelineIntent === 'general') {
                try {
                    const assistantResult = await buildAssistantContext({ getDynamicPrompt });
                    sysPrompt = assistantResult.systemInstructions;
                } catch (err) {
                    console.error("Failed to build assistant context, using fallback", err);
                }
            } else if (pipelineIntent === 'algorithm') {
                sysPrompt = "You are an expert Quantum Algorithm Scientist. Formulate high-level quantum algorithms and compile them into programs using frameworks like Qiskit or Pennylane.";
            } else if (pipelineIntent === 'coder' || pipelineIntent === 'code') {
                sysPrompt = "You are an expert Quantum Circuit Engineer. Design, optimize, and simulate quantum logic gate circuits using Qiskit, Cirq, or OpenQASM.";
            }

            const backendRes = await axios.post(`${backendUrl}/v2/chat`, {
                message: finalPrompt,
                system_prompt: sysPrompt
            });
            const data = backendRes.data;

            let responseText = data.response || "";
            if (!responseText.trim()) {
                responseText = "⚠️ The Qwen 32B model returned an empty response. Please try again.";
            }

            const workflowSteps = {
                nlp: "Bypassed",
                reasoner: "Bypassed",
                suggestor: "Bypassed",
                solver: `Direct Qwen 32B — Mode: ${pipelineIntent}`,
                verifier: "Verification: Handled by generative model",
                dcc: false
            };

            await ChatLog.create({
                userQuery: finalPrompt,
                aiResponse: responseText,
                source: 'direct_qwen',
                guardrailsStatus: 'passed',
                activeGuardrails: ruleTexts,
                systemPrompt: sysPrompt,
                mode: pipelineIntent
            });

            return {
                text: responseText,
                source: 'direct_qwen',
                guardrailsStatus: 'passed',
                activeGuardrails: ruleTexts,
                tokensUsed: 0,
                workflowSteps
            };

        } catch (err: any) {
            console.error("Backend request failed:", err);
            return {
                text: "❌ **Connection Error**: Failed to reach the QuantumGuru engine.\n**Details**: " + err.message,
                source: 'error',
                guardrailsStatus: 'passed',
                activeGuardrails: ruleTexts,
                tokensUsed: 0
            };
        }
    }

    return { text: "An unexpected error occurred.", error: "UNHANDLED", source: "error", tokensUsed: 0 };
}

// --- Chat Session History Actions ---
async function getCurrentUserEmail(): Promise<string | null> {
    try {
        const cookieStore = await cookies();
        const sessionToken = cookieStore.get('user_session')?.value;
        if (!sessionToken) return null;
        
        await dbConnect();
        const session = await UserSession.findOne({ token: sessionToken });
        if (!session) return null;

        const user = await User.findOne({ email: session.email });
        if (!user || (user.role !== 'admin' && user.isApproved === false)) return null;

        // Demo expiration check
        if (user.role === 'demo' && user.demoExpiresAt && new Date() > new Date(user.demoExpiresAt)) {
            console.log(`[getCurrentUserEmail] Demo account expired for email: ${user.email}`);
            return null;
        }

        return session.email;
    } catch (e) {
        console.error("[getCurrentUserEmail] Error reading session token:", e);
        return null;
    }
}

export async function getChatSessions(pipeline?: string) {
    const userEmail = await getCurrentUserEmail();
    if (!userEmail) return []; // strict RLS: return empty if not authenticated
    
    await dbConnect();
    
    // Scopes to this user OR legacy sessions without a userEmail field
    const userFilter = { $or: [{ userEmail }, { userEmail: { $exists: false } }] };
    let query: any = { ...userFilter };
    
    if (pipeline) {
        if (pipeline === 'general') {
            query = {
                ...userFilter,
                $or: [{ pipeline: 'general' }, { pipeline: { $exists: false } }]
            };
        } else {
            query = {
                ...userFilter,
                pipeline
            };
        }
    }
    
    const sessions = await ChatSession.find(query).sort({ updatedAt: -1 });
    return JSON.parse(JSON.stringify(sessions));
}

export async function createChatSession(
    title: string,
    messages: any[],
    workflowSteps: any,
    pipeline?: string
) {
    const userEmail = await getCurrentUserEmail();
    if (!userEmail) throw new Error("Unauthorized");
    
    await dbConnect();
    const newId = new mongoose.Types.ObjectId().toString();
    const session = await ChatSession.create({
        _id: newId,
        sessionId: newId,
        title,
        messages,
        workflowSteps,
        pipeline: pipeline || "general",
        userEmail
    });
    return JSON.parse(JSON.stringify(session));
}

export async function updateChatSession(
    id: string,
    messages: any[],
    workflowSteps: any
) {
    const userEmail = await getCurrentUserEmail();
    if (!userEmail) throw new Error("Unauthorized");
    
    await dbConnect();
    
    const existing = await ChatSession.findById(id);
    // Strict RLS: Allow update if owned by user OR if it's a legacy session (no userEmail)
    if (!existing || (existing.userEmail && existing.userEmail !== userEmail)) {
        throw new Error("Unauthorized - Access Denied");
    }
    
    const session = await ChatSession.findByIdAndUpdate(id, {
        messages,
        workflowSteps,
        userEmail // Claim the session under their account on first update
    }, { new: true });
    return JSON.parse(JSON.stringify(session));
}

export async function deleteChatSession(id: string) {
    const userEmail = await getCurrentUserEmail();
    if (!userEmail) throw new Error("Unauthorized");
    
    await dbConnect();
    
    const existing = await ChatSession.findById(id);
    // Strict RLS: Allow delete if owned by user OR if it's a legacy session (no userEmail)
    if (!existing || (existing.userEmail && existing.userEmail !== userEmail)) {
        throw new Error("Unauthorized - Access Denied");
    }
    
    await ChatSession.findByIdAndDelete(id);
    return { success: true };
}
