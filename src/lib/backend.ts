/**
 * Resolves the Backend Gateway URL reliably across local and production deployments.
 * Automatically guarantees:
 * - In production (or when deployed on Vercel), falls back to the live Railway backend if NEXT_PUBLIC_BACKEND_URL is not provided
 * - Prepends "https://" if scheme was omitted by the user
 * - Strips any trailing slash
 * - Preserves "http://" for localhost development
 */
export function getBackendUrl(): string {
    const raw = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || "";
    if (!raw) {
        // When running in browser on production (non-localhost) or in server production environment
        if (typeof window !== 'undefined' && !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1')) {
            return "https://quantum-guru-09-09-2026-production.up.railway.app";
        }
        if (process.env.NODE_ENV === 'production') {
            return "https://quantum-guru-09-09-2026-production.up.railway.app";
        }
        return "http://localhost:8002";
    }
    const trimmed = raw.trim().replace(/\/+$/, "");
    if (!trimmed) return "http://localhost:8002";
    if (/^https?:\/\//i.test(trimmed)) {
        return trimmed;
    }
    return (trimmed.startsWith("localhost") || trimmed.startsWith("127.0.0.1"))
        ? `http://${trimmed}`
        : `https://${trimmed}`;
}
