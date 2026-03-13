import axios from 'axios';

const QISKIT_SERVICE_URL = process.env.QISKIT_SERVICE_URL || "http://127.0.0.1:8001";
const DWAVE_SERVICE_URL = process.env.DWAVE_SERVICE_URL || "http://127.0.0.1:8002";
const API_SECRET = process.env.API_SECRET_KEY || "dev_secret_key_123";

/**
 * Executes Qiskit/Python code on the external simulator service.
 */
export async function executeQuantumCircuit(circuitCode: string) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 59000); // 59s explicit timeout
    try {
        const url = `${QISKIT_SERVICE_URL}/execute`;
        const startTime = Date.now();

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
        if (axios.isCancel(e) || e.name === 'CanceledError' || e.message === 'canceled') {
            return { error: "Qiskit Simulator Timeout (59s)" };
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
export async function executeDWaveAnnealer(code: string) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 59000); // 59s explicit timeout
    try {
        const url = `${DWAVE_SERVICE_URL}/execute`;
        const startTime = Date.now();

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
        if (axios.isCancel(e) || e.name === 'CanceledError' || e.message === 'canceled') {
            return { error: "D-Wave Simulator Timeout (59s)" };
        }
        if (e.code === 'ECONNREFUSED') {
            return { error: "D-Wave Simulator is offline." };
        }
        return { error: `Annealer Service Error: ${e.message}` };
    }
}
