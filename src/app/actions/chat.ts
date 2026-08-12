"use server";

import axios from 'axios';
import * as cheerio from 'cheerio';
import dbConnect from '@/lib/db';
import QaPair from '@/models/QaPair';
import Guardrail from '@/models/Guardrail';
import ChatLog from '@/models/ChatLog';
import User from '@/models/User';
import SystemPrompt from '@/models/SystemPrompt';
import ChatSession from '@/models/ChatSession';
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

    // Sanitize prompt
    const sanitizedPrompt = prompt.replace(/[{}]/g, '').trim();

    // 1. Token limit check
    if (contextConfig?.userEmail) {
        const user = await User.findOne({ email: contextConfig.userEmail }).lean() as any;
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
                        penalty_label: "Proposed Penalty 3 (Verma-Lewis)",
                        penalty_weight: 2.0, // Default Verma-Lewis penalty weight
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
            if (pipelineIntent === 'algorithm') {
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
export async function getChatSessions() {
    await dbConnect();
    const sessions = await ChatSession.find({}).sort({ updatedAt: -1 });
    return JSON.parse(JSON.stringify(sessions));
}

export async function createChatSession(
    title: string,
    messages: any[],
    workflowSteps: any
) {
    await dbConnect();
    const mongoose = require('mongoose');
    const newId = new mongoose.Types.ObjectId().toString();
    const session = await ChatSession.create({
        _id: newId,
        sessionId: newId,
        title,
        messages,
        workflowSteps
    });
    return JSON.parse(JSON.stringify(session));
}

export async function updateChatSession(
    id: string,
    messages: any[],
    workflowSteps: any
) {
    await dbConnect();
    const session = await ChatSession.findByIdAndUpdate(id, {
        messages,
        workflowSteps
    }, { new: true });
    return JSON.parse(JSON.stringify(session));
}

export async function deleteChatSession(id: string) {
    await dbConnect();
    await ChatSession.findByIdAndDelete(id);
    return { success: true };
}
