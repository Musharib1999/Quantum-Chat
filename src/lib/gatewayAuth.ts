/**
 * Gateway service authentication (Next.js side).
 *
 * The browser never calls the Python gateway directly. Next.js routes verify the user's
 * `user_session` cookie, then forward the request with a short-lived HMAC-signed identity
 * token in the `X-Gateway-Auth` header. The gateway verifies it with the same shared secret.
 *
 * Token format (matches Python service_auth.py):
 *   v1.<b64url(json payload)>.<b64url(HMAC-SHA256(secret, "v1." + payload_b64))>
 *   payload = { sub, role, iat, exp, nonce }
 *
 * Environment:
 *   GATEWAY_SHARED_SECRET   signing secret (comma-separated list: first entry signs)
 *   GATEWAY_AUTH_ENFORCE=1  reject unauthenticated callers here with 401 before reaching gateway
 */
import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { resolveSession, resolveSessionFromToken, SessionIdentity } from './auth';

export const GATEWAY_HEADER = 'x-gateway-auth';
const TOKEN_VERSION = 'v1';
const DEFAULT_TTL_SECONDS = 60;

function b64url(buf: Buffer): string {
    return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function signingSecret(): string | null {
    const raw = process.env.GATEWAY_SHARED_SECRET || '';
    const first = raw.split(',').map(s => s.trim()).filter(Boolean)[0];
    return first || null;
}

export function gatewayAuthEnforced(): boolean {
    return ['1', 'true', 'yes', 'on'].includes((process.env.GATEWAY_AUTH_ENFORCE || '').trim().toLowerCase());
}

export interface SignOptions {
    ttlSeconds?: number;
    now?: number; // epoch seconds
    nonce?: string;
    secret?: string;
}

export function signGatewayToken(identity: SessionIdentity, opts: SignOptions = {}): string {
    const secret = opts.secret ?? signingSecret();
    if (!secret) throw new Error('GATEWAY_SHARED_SECRET is not configured');
    const iat = Math.floor(opts.now ?? Date.now() / 1000);
    const payload = {
        sub: identity.email,
        role: identity.role || 'user',
        iat,
        exp: iat + (opts.ttlSeconds ?? DEFAULT_TTL_SECONDS),
        nonce: opts.nonce ?? b64url(crypto.randomBytes(9)),
    };
    const payloadB64 = b64url(Buffer.from(JSON.stringify(payload), 'utf8'));
    const sig = b64url(crypto.createHmac('sha256', secret).update(`${TOKEN_VERSION}.${payloadB64}`).digest());
    return `${TOKEN_VERSION}.${payloadB64}.${sig}`;
}

export type GatewayAuthResult =
    | { ok: true; headers: Record<string, string>; identity: SessionIdentity | null }
    | { ok: false; response: NextResponse };

function build(identity: SessionIdentity | null): GatewayAuthResult {
    const secret = signingSecret();
    if (!identity) {
        if (gatewayAuthEnforced()) {
            return {
                ok: false,
                response: NextResponse.json(
                    { success: false, error: 'Unauthorized - please sign in to use this feature.' },
                    { status: 401 }
                ),
            };
        }
        return { ok: true, headers: {}, identity: null };
    }
    if (!secret) {
        if (gatewayAuthEnforced()) {
            console.error('[gatewayAuth] GATEWAY_AUTH_ENFORCE is on but GATEWAY_SHARED_SECRET is not set');
            return {
                ok: false,
                response: NextResponse.json(
                    { success: false, error: 'Gateway authentication is misconfigured.' },
                    { status: 500 }
                ),
            };
        }
        return { ok: true, headers: {}, identity };
    }
    return { ok: true, headers: { [GATEWAY_HEADER]: signGatewayToken(identity, { secret }) }, identity };
}

/** For API routes: verifies the session cookie and returns headers to forward to the gateway. */
export async function gatewayAuth(req: NextRequest): Promise<GatewayAuthResult> {
    return build(await resolveSession(req));
}

/** For server actions: same, from the raw cookie value. */
export async function gatewayAuthFromSessionToken(sessionToken: string | null | undefined): Promise<GatewayAuthResult> {
    return build(await resolveSessionFromToken(sessionToken));
}
