import axios from 'axios';

const QISKIT_SERVICE_URL = process.env.QISKIT_SERVICE_URL;
const DWAVE_SERVICE_URL = process.env.DWAVE_SERVICE_URL;
const ORTOOLS_SERVICE_URL = process.env.ORTOOLS_SERVICE_URL;
const API_SECRET = process.env.API_SECRET_KEY;
const DWAVE_API_KEY = process.env.DWAVE_API_KEY || API_SECRET || "dev_secret_key_123";

/**
 * Trims trailing slashes from a URL to prevent routing errors (e.g. //execute)
 */
const sanitizeUrl = (url: string) => {
    let cleanUrl = url.replace(/\/+$/, '');
    if (cleanUrl && !cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
        cleanUrl = 'https://' + cleanUrl;
    }
    return cleanUrl;
};

/**
 * Executes Qiskit/Python code on the external simulator service.
 */
export async function executeQuantumCircuit(circuitCode: string, overrideUrl?: string) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 115000); // 1.9m explicit timeout for complex circuits
    try {
        const baseUrl = sanitizeUrl(overrideUrl || QISKIT_SERVICE_URL || '');
        const url = `${baseUrl}/execute`;
        const startTime = Date.now();

        console.log(`[Simulator] Calling Qiskit: ${url} with secret length: ${API_SECRET?.length || 0}`);

        const response = await axios.post(url, {
            code: circuitCode
        }, {
            headers: { 'X-API-Key': API_SECRET },
            signal: controller.signal
        });
        
        const executionTimeMs = Date.now() - startTime;
        clearTimeout(timeoutId);

        return { ...response.data, executionTimeMs };
    } catch (e: any) {
        clearTimeout(timeoutId);
        
        // Detailed error capture for debugging 401/404
        if (e.response) {
            console.error(`[Simulator] Qiskit Error ${e.response.status}:`, e.response.data);
            return { 
                error: `Quantum Service Error: Received ${e.response.status} from backend.`,
                details: e.response.data
            };
        }

        if (axios.isCancel(e) || e.name === 'CanceledError' || e.message === 'canceled') {
            return { error: "Qiskit Simulator Timeout (115s)" };
        }
        if (e.code === 'ECONNREFUSED') {
            return { error: "Qiskit Simulator is offline." };
        }
        return { error: `Quantum Service Error: ${e.message}` };
    }
}

/**
 * Executes D-Wave/Python code on the external annealer service.
 */
export async function executeDWaveAnnealer(code: string, overrideUrl?: string) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 115000); // 1.9m timeout
    try {
        const baseUrl = sanitizeUrl(overrideUrl || DWAVE_SERVICE_URL || '');
        if (!baseUrl) {
            throw new Error(`CONFIGURATION ERROR: D-Wave Simulator URL is missing. No hardware mapped and DWAVE_SERVICE_URL is empty.`);
        }
        
        const url = `${baseUrl}/execute`;
        const startTime = Date.now();

        console.log(`[Simulator] Calling D-Wave: ${url}`);

        const response = await axios.post(url, {
            code: code
        }, {
            headers: { 'X-API-Key': DWAVE_API_KEY },
            signal: controller.signal
        });
        
        const executionTimeMs = Date.now() - startTime;
        clearTimeout(timeoutId);

        return { ...response.data, executionTimeMs };
    } catch (e: any) {
        clearTimeout(timeoutId);

        if (e.response) {
            console.error(`[Simulator] D-Wave Error ${e.response.status}:`, e.response.data);
            return { 
                error: `Annealer Service Error: Received ${e.response.status} from backend.`,
                details: e.response.data
            };
        }

        if (axios.isCancel(e) || e.name === 'CanceledError' || e.message === 'canceled') {
            return { error: "D-Wave Simulator Timeout (115s)" };
        }
        if (e.code === 'ECONNREFUSED') {
            return { error: "D-Wave Simulator is offline." };
        }
        return { error: `Annealer Service Error: ${e.message}` };
    }
}

/**
 * Executes Google OR-Tools/Python code on the external solver service.
 */
export async function executeORTools(code: string, overrideUrl?: string) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 115000); // 1.9m timeout
    try {
        const baseUrl = sanitizeUrl(overrideUrl || ORTOOLS_SERVICE_URL || '');
        const url = `${baseUrl}/execute`;
        const startTime = Date.now();

        console.log(`[Simulator] Calling OR-Tools: ${url}`);

        const response = await axios.post(url, {
            code: code
        }, {
            headers: { 'X-API-Key': API_SECRET },
            signal: controller.signal
        });
        
        const executionTimeMs = Date.now() - startTime;
        clearTimeout(timeoutId);

        return { ...response.data, executionTimeMs };
    } catch (e: any) {
        clearTimeout(timeoutId);

        if (e.response) {
            console.error(`[Simulator] OR-Tools Error ${e.response.status}:`, e.response.data);
            return { 
                error: `OR-Tools Service Error: Received ${e.response.status} from backend.`,
                details: e.response.data
            };
        }

        if (axios.isCancel(e) || e.name === 'CanceledError' || e.message === 'canceled') {
            return { error: "OR-Tools Solver Timeout (115s)" };
        }
        if (e.code === 'ECONNREFUSED') {
            return { error: "OR-Tools Solver is offline." };
        }
        return { error: `OR-Tools Service Error: ${e.message}` };
    }
}
