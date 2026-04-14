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

        const hardware = blueprint.hardware || 'Universal';
        const normalize = (s: string) => s.toLowerCase().replace(/[-_\s]/g, '');
        const template = blueprint.codeTemplates?.find((t: any) => 
            normalize(t.hardware) === normalize(hardware)
        )?.code;
        
        if (!template) {
            throw new Error(`No code template found for hardware: ${hardware}`);
        }

        // 2. Synthesize/Embed the Payload into the Blueprint Template
        let executableCode = template;
        
        // Very basic string replacement embedding (Enterprise payloads MUST match blueprint variables exactly)
        // e.g., if payload is { "budget": 5000 }, we replace {{budget}} with 5000.
        // For strings, we wrap in quotes.
        Object.keys(payload).forEach(key => {
            const val = payload[key];
            const replacement = typeof val === 'string' ? `"${val}"` : JSON.stringify(val);
            const regex = new RegExp(`{{${key}}}`, 'g');
            executableCode = executableCode.replace(regex, replacement);
        });

        // Fallback for GUI-builder format dictionaries:
        executableCode = executableCode.replace('{{PARAMETERS_JSON}}', JSON.stringify(payload, null, 2));

        // 3. Execute the Simulator
        let provider = 'qiskit';
        if (blueprint.executionEnvironment === 'python-dwave' || hardware.toLowerCase().includes('dwave')) {
            provider = 'dwave';
        } else if (hardware.toLowerCase().includes('google') || hardware.toLowerCase().includes('ortools')) {
            provider = 'ortools';
        }

        // For D-Wave: strip any pre-existing import lines that the executor will inject automatically.
        // The executor's main.py prepends didom/neal/numpy imports using the absolute venv path.
        // Duplicate imports confuse the subprocess and cause ModuleNotFoundError.
        if (provider === 'dwave') {
            const importBlacklist = ['import dimod', 'from dimod import', 'import neal', 'from neal import', 'import numpy', 'from numpy import'];
            executableCode = executableCode
                .split('\n')
                .filter((line: string) => !importBlacklist.some(bad => line.trim().startsWith(bad)))
                .join('\n');
        }

        let executionResult: any;
        console.log(`[StreamHandler] Dispatching to ${provider.toUpperCase()} backend...`);

        if (provider === 'qiskit') {
            executionResult = await executeQuantumCircuit(executableCode);
        } else if (provider === 'dwave') {
            executionResult = await executeDWaveAnnealer(executableCode);
        } else if (provider === 'ortools') {
            executionResult = await executeORTools(executableCode);
        }

        // 4. Log the "Shot" for billing and audit
        const shot = await Shot.create({
            userId: userId,
            timestamp: new Date(),
            industry: blueprint.industry,
            service: blueprint.service,
            problem: blueprint.problem,
            hardware: hardware,
            parameters: payload,
            qiskitCode: executableCode,
            results: executionResult,
            analysis: 'Automated Enterprise Stream Execution',
            source: 'Enterprise-Stream'
        });

        const executionDuration = Date.now() - startTime;
        console.log(`[StreamHandler] Shot ${shot._id} executed in ${executionDuration}ms.`);

        // 5. Push the Oubound Result to the Enterprise Webhook
        await pushToWebhook(pipeline.webhookUrl, {
            shotId: shot._id,
            enterprise: pipeline.enterpriseName,
            status: executionResult?.error ? 'failed' : 'success',
            results: executionResult,
            executionTimeMs: executionDuration,
            timestamp: new Date().toISOString()
        });

        return {
            success: true,
            shotId: shot._id,
            durationMs: executionDuration
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
 * Pushes the executed JSON payload asynchronously to the client's Webhook URL.
 */
async function pushToWebhook(url: string, payload: any) {
    try {
        console.log(`[Webhook] Pushing result to ${url}`);
        await axios.post(url, payload, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 5000 // Do not block our server forever if their webhook is down
        });
        console.log(`[Webhook] Successfully delivered shot ${payload.shotId}`);
    } catch (error: any) {
        console.error(`[Webhook] Failed to deliver shot ${payload.shotId} to ${url}. Error: ${error.message}`);
        // In a production environment, we would implement retry logic or a Dead Letter Queue (DLQ) here.
    }
}
