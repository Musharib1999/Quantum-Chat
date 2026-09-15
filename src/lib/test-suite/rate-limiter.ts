/**
 * rate-limiter.ts
 * Adaptive Rate Limiting, Exponential Backoff, and 429 Telemetry Handler for Groq API.
 */

export interface RateLimitRetryOptions {
    maxRetries?: number;
    initialBackoffMs?: number;
    backoffMultiplier?: number;
    maxBackoffMs?: number;
    jitterMs?: number;
    onRetry?: (attempt: number, waitMs: number, errorMsg: string) => void;
}

export interface RateLimitedFetchResult<T> {
    success: boolean;
    data?: T;
    error?: string;
    statusCode: number;
    retries429: number;
    totalWaitMs: number;
    durationMs: number;
}

export class QuantumRateLimiter {
    private lastRequestTimestamp = 0;
    private interRequestDelayMs: number;

    constructor(interRequestDelayMs = 3500) {
        this.interRequestDelayMs = interRequestDelayMs;
    }

    /**
     * Enforce inter-request pacing to avoid blasting the TPM threshold.
     */
    async pace(): Promise<number> {
        const now = Date.now();
        const elapsed = now - this.lastRequestTimestamp;
        let pacedWait = 0;
        if (this.lastRequestTimestamp > 0 && elapsed < this.interRequestDelayMs) {
            pacedWait = this.interRequestDelayMs - elapsed;
            await new Promise(resolve => setTimeout(resolve, pacedWait));
        }
        this.lastRequestTimestamp = Date.now();
        return pacedWait;
    }

    /**
     * Execute an asynchronous request with full HTTP 429 adaptive backoff.
     */
    async executeWithRetry<T>(
        fn: () => Promise<Response>,
        options: RateLimitRetryOptions = {}
    ): Promise<RateLimitedFetchResult<T>> {
        const maxRetries = options.maxRetries ?? 4;
        let backoff = options.initialBackoffMs ?? 2000;
        const multiplier = options.backoffMultiplier ?? 2.0;
        const maxBackoff = options.maxBackoffMs ?? 25000;
        const jitter = options.jitterMs ?? 800;

        let retries429 = 0;
        let totalWaitMs = 0;
        const startTime = Date.now();

        await this.pace();

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                const res = await fn();
                const statusCode = res.status;

                // Case 1: HTTP 429 Rate Limit
                if (statusCode === 429) {
                    retries429++;
                    let waitTime = backoff;

                    // Check for standard Retry-After header
                    const retryAfterHeader = res.headers.get('retry-after');
                    if (retryAfterHeader) {
                        const parsedSec = parseFloat(retryAfterHeader);
                        if (!isNaN(parsedSec)) {
                            waitTime = Math.max(waitTime, Math.ceil(parsedSec * 1000));
                        }
                    } else {
                        // Check response body for rate limit text e.g. "try again in 3.4s"
                        const errText = await res.text().catch(() => '');
                        const match = errText.match(/try again in (\d+(\.\d+)?)s/i);
                        if (match && match[1]) {
                            const parsedSec = parseFloat(match[1]);
                            if (!isNaN(parsedSec)) {
                                waitTime = Math.max(waitTime, Math.ceil(parsedSec * 1000));
                            }
                        }
                    }

                    // Add randomized jitter to prevent thundering herd
                    const randomJitter = Math.floor(Math.random() * jitter);
                    const finalWait = Math.min(maxBackoff, waitTime + randomJitter);

                    totalWaitMs += finalWait;

                    if (options.onRetry) {
                        options.onRetry(attempt + 1, finalWait, `HTTP 429 Rate limit encountered`);
                    }

                    if (attempt < maxRetries) {
                        await new Promise(resolve => setTimeout(resolve, finalWait));
                        backoff = Math.min(maxBackoff, backoff * multiplier);
                        continue;
                    } else {
                        return {
                            success: false,
                            error: `Groq Rate Limit exceeded after ${maxRetries} retries (HTTP 429)`,
                            statusCode: 429,
                            retries429,
                            totalWaitMs,
                            durationMs: Date.now() - startTime
                        };
                    }
                }

                // Case 2: Other HTTP Errors
                if (!res.ok) {
                    const errBody = await res.json().catch(() => ({ error: `HTTP ${statusCode}` }));
                    return {
                        success: false,
                        error: errBody.error || errBody.message || `HTTP ${statusCode}`,
                        statusCode,
                        retries429,
                        totalWaitMs,
                        durationMs: Date.now() - startTime
                    };
                }

                // Case 3: HTTP 200 Success
                const data = (await res.json()) as T;
                return {
                    success: true,
                    data,
                    statusCode: 200,
                    retries429,
                    totalWaitMs,
                    durationMs: Date.now() - startTime
                };
            } catch (networkErr: any) {
                // If network timeout or reset, apply backoff and retry
                if (attempt < maxRetries) {
                    const waitTime = backoff;
                    totalWaitMs += waitTime;
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                    backoff = Math.min(maxBackoff, backoff * multiplier);
                } else {
                    return {
                        success: false,
                        error: networkErr.message || 'Network communication error',
                        statusCode: 0,
                        retries429,
                        totalWaitMs,
                        durationMs: Date.now() - startTime
                    };
                }
            }
        }

        return {
            success: false,
            error: 'Max retries exhausted',
            statusCode: 500,
            retries429,
            totalWaitMs,
            durationMs: Date.now() - startTime
        };
    }
}

export const globalRateLimiter = new QuantumRateLimiter(3500);
