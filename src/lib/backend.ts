/**
 * Resolves the Backend Gateway URL reliably across local and production deployments.
 * Automatically guarantees:
 * - Prepends "https://" if scheme was omitted by the user
 * - Strips any trailing slash
 * - Preserves "http://" for localhost development
 */
export function getBackendUrl(): string {
    const raw = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8002";
    const trimmed = raw.trim().replace(/\/+$/, "");
    if (!trimmed) return "http://localhost:8002";
    if (/^https?:\/\//i.test(trimmed)) {
        return trimmed;
    }
    return (trimmed.startsWith("localhost") || trimmed.startsWith("127.0.0.1"))
        ? `http://${trimmed}`
        : `https://${trimmed}`;
}
