import { executeQuantumCircuit, executeDWaveAnnealer, executeORTools } from '@/lib/quantum-simulator';
import Shot from '@/models/Shot';
import QuantumForm from '@/models/QuantumForm';
import { IDataPipeline } from '@/models/DataPipeline';
import axios from 'axios';

/**
 * Handles the ingestion, embedding, execution, and outbound webhook pushing
 * for Enterprise Data Streams.
 */
export async function processEnterpriseStream(payload: any, pipeline: IDataPipeline, userId: string) {
    const startTime = Date.now();
    try {
        console.log(`[StreamHandler] Processing inbound payload for pipeline: ${pipeline._id} (Enterprise: ${pipeline.enterpriseName})`);

        // 1. Fetch the linked Quantum Blueprint
        const blueprint = await QuantumForm.findById(pipeline.problemId).lean() as any;
        if (!blueprint) {
            throw new Error(`Linked Blueprint ${pipeline.problemId} not found or inactive.`);
        }

        const templates = blueprint.codeTemplates || [];
        if (templates.length === 0) {
            throw new Error(`No code templates found for blueprint ${blueprint.problem}`);
        }

        const mongoose = (await import('mongoose')).default;
        const Hardware = mongoose.models.Hardware || (await import('@/models/Hardware')).default;

        const toPythonLiteral = (json: string): string =>
            json
                .replace(/\btrue\b/g, 'True')
                .replace(/\bfalse\b/g, 'False')
                .replace(/\bnull\b/g, 'None');

        const executions = await Promise.all(templates.map(async (t: any) => {
            const hardwareName = t.hardware;
            let executableCode = t.code;

            Object.keys(payload).forEach(key => {
                const val = payload[key];
                const replacement = typeof val === 'string'
                    ? `"${val.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`
                    : toPythonLiteral(JSON.stringify(val));
                const regex = new RegExp(`{{${key}}}`, 'g');
                executableCode = executableCode.replace(regex, () => replacement);
            });

            executableCode = executableCode.replace(
                '{{PARAMETERS_JSON}}',
                () => toPythonLiteral(JSON.stringify(payload, null, 2))
            );

            let provider = 'qiskit';
            if (blueprint.executionEnvironment === 'python-dwave' || hardwareName.toLowerCase().includes('dwave')) {
                provider = 'dwave';
            } else if (hardwareName.toLowerCase().includes('google') || hardwareName.toLowerCase().includes('ortools')) {
                provider = 'ortools';
            }

            let hwRecord = await Hardware.findOne({ 
                name: { $regex: new RegExp(`^${hardwareName}$`, 'i') } 
            }).lean() as any;

            if (!hwRecord) {
                 hwRecord = await Hardware.findOne({ provider: provider === 'dwave' ? 'dwave' : { $ne: 'dwave' } }).sort({ order: 1 }).lean() as any;
            }
            const serviceUrl = hwRecord?.serviceUrl;

            if (provider === 'dwave') {
                const importBlacklist = ['import dimod', 'from dimod import', 'import neal', 'from neal import', 'import numpy', 'from numpy import'];
                executableCode = executableCode
                    .split('\n')
                    .filter((line: string) => !importBlacklist.some(bad => line.trim().startsWith(bad)))
                    .join('\n');
            }

            let executionResult: any;
            const execStartTime = Date.now();
            console.log(`[StreamHandler] Dispatching to ${provider.toUpperCase()} backend at ${serviceUrl || 'Default Env'}...`);

            try {
                if (provider === 'qiskit') {
                    executionResult = await executeQuantumCircuit(executableCode, serviceUrl);
                } else if (provider === 'dwave') {
                    executionResult = await executeDWaveAnnealer(executableCode, serviceUrl);
                } else if (provider === 'ortools') {
                    executionResult = await executeORTools(executableCode, serviceUrl);
                }
            } catch (e: any) {
                executionResult = { error: e.message };
            }

            const executionDuration = Date.now() - execStartTime;
            
            const shot = await Shot.create({
                userId: userId,
                timestamp: new Date(),
                industry: blueprint.industry,
                service: blueprint.service,
                problem: blueprint.problem,
                hardware: hardwareName,
                parameters: payload,
                qiskitCode: executableCode,
                results: executionResult,
                analysis: 'Automated Enterprise Stream Execution',
                source: 'Enterprise-Stream',
                executionTimeMs: executionDuration
            });

            console.log(`[StreamHandler] Shot ${shot._id} executed on ${hardwareName} in ${executionDuration}ms.`);

            return {
                hardware: hardwareName,
                shotId: shot._id,
                status: executionResult?.error ? 'failed' : 'success',
                results: executionResult,
                executionTimeMs: executionDuration
            };
        }));

        const totalDuration = Date.now() - startTime;

        // 5. Push the Oubound Result to the Enterprise Webhook (Async/Non-blocking)
        pushToWebhook(pipeline.webhookUrl, {
            callId: payload.call?.call_id || 'N/A', // Correlation ID for the showcase
            enterprise: pipeline.enterpriseName,
            status: executions.some(e => e.status === 'success') ? 'success' : 'failed',
            solutions: executions,
            totalExecutionTimeMs: totalDuration,
            timestamp: new Date().toISOString()
        });

        return {
            success: true,
            shotIds: executions.map(e => e.shotId),
            durationMs: totalDuration
        };

    } catch (error: any) {
        console.error(`[StreamHandler] Pipeline ${pipeline._id} Error:`, error);
        
        // Log failed shots if possible
        await Shot.create({
            userId: userId,
            timestamp: new Date(),
            industry: 'Enterprise Error',
            service: 'Stream Integration',
            problem: 'Pipeline Failure',
            hardware: 'Unknown',
            parameters: payload,
            qiskitCode: 'N/A',
            results: { error: error.message },
            analysis: 'Failed during ingestion or embedding phase.',
            source: 'Enterprise-Stream'
        });
        
        throw error;
    }
}

/**
 * Pushes the executed JSON payload asynchronously to the client's Webhook URL
 * and logs the delivery status for self-healing.
 */
async function pushToWebhook(url: string, payload: any) {
    try {
        console.log(`[Webhook] Pushing result to ${url}`);
        await axios.post(url, payload, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 5000 // Do not block our server forever if their webhook is down
        });
        console.log(`[Webhook] Successfully delivered shot ${payload.shotId}`);
        
        // Update database status for Self-Healing Dashboard
        await Shot.findByIdAndUpdate(payload.shotId, { 
            $set: { webhookStatus: 'success' } 
        });

    } catch (error: any) {
        console.error(`[Webhook] Failed to deliver shot ${payload.shotId} to ${url}. Error: ${error.message}`);
        
        // Mark as failed in database so the Dead Letter Queue / Self Healing job can pick it up
        await Shot.findByIdAndUpdate(payload.shotId, { 
            $set: { webhookStatus: 'failed' } 
        });
    }
}
