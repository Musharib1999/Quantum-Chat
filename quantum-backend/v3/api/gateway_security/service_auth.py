"""
Gateway service authentication (DRAFT — intended path: quantum-backend/v3/api/gateway_security/service_auth.py).

Trust model: the browser never talks to the gateway directly. Next.js verifies the session cookie, then
forwards the request with a short-lived HMAC-signed identity token in `X-Gateway-Auth`.

Token:   v1.<b64url(json payload)>.<b64url(HMAC-SHA256(secret, "v1." + payload_b64))>
Payload: {"sub", "role", "iat", "exp", "nonce"}

Flags (default OFF => current behaviour unchanged):
    GATEWAY_AUTH_ENFORCE=1   reject requests without a valid token
    GATEWAY_SHARED_SECRET    signing secret; comma-separated list = rotation window (first signs)
    ENV=production           requires ENFORCE=1 + secret, else the process refuses to start
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import time
from dataclasses import dataclass
from typing import Dict, Iterable, List, Optional

TOKEN_VERSION = "v1"
HEADER_NAME = "x-gateway-auth"
MAX_TOKEN_LIFETIME_S = 300
MAX_CLOCK_SKEW_S = 60
MAX_TOKEN_BYTES = 4096
PUBLIC_EXACT = {"/", "/health", "/v3/health"}


class AuthError(Exception):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message


@dataclass(frozen=True)
class Identity:
    sub: str
    role: str = "user"
    exp: int = 0

    @property
    def is_admin(self) -> bool:
        return self.role == "admin"


def _b64e(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")


def _b64d(text: str) -> bytes:
    return base64.urlsafe_b64decode(text + "=" * (-len(text) % 4))


def _sign(secret: str, payload_b64: str) -> str:
    mac = hmac.new(secret.encode("utf-8"), f"{TOKEN_VERSION}.{payload_b64}".encode("ascii"), hashlib.sha256)
    return _b64e(mac.digest())


def sign_token(secret: str, sub: str, role: str = "user", ttl_s: int = 60,
               now: Optional[float] = None, nonce: Optional[str] = None) -> str:
    if not secret:
        raise ValueError("secret must not be empty")
    t = int(now if now is not None else time.time())
    payload = {"sub": sub, "role": role, "iat": t, "exp": t + int(ttl_s),
               "nonce": nonce or _b64e(os.urandom(9))}
    payload_b64 = _b64e(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    return f"{TOKEN_VERSION}.{payload_b64}.{_sign(secret, payload_b64)}"


class NonceCache:
    """Remembers nonces until token expiry to reject replays. Bounded; refuses (fails closed) when full of live nonces."""

    def __init__(self, max_entries: int = 50_000):
        self._seen: Dict[str, float] = {}
        self._max = max_entries

    def check_and_add(self, nonce: str, exp: float, now: float) -> bool:
        if len(self._seen) >= self._max:
            self._seen = {k: e for k, e in self._seen.items() if e > now}
            if len(self._seen) >= self._max:
                return False
        if nonce in self._seen and self._seen[nonce] > now:
            return False
        self._seen[nonce] = exp
        return True


def parse_secrets(raw: Optional[str]) -> List[str]:
    return [s.strip() for s in (raw or "").split(",") if s.strip()]


def verify_token(token: str, secrets: Iterable[str], now: Optional[float] = None,
                 nonce_cache: Optional[NonceCache] = None) -> Identity:
    t = float(now if now is not None else time.time())
    secrets = [s for s in secrets if s]
    if not secrets:
        raise AuthError("no_secret", "Gateway has no signing secret configured")
    if not token or len(token) > MAX_TOKEN_BYTES:
        raise AuthError("malformed", "Missing or oversized token")
    parts = token.split(".")
    if len(parts) != 3 or parts[0] != TOKEN_VERSION:
        raise AuthError("malformed", "Malformed token")
    _, payload_b64, sig = parts

    ok = False
    for secret in secrets:
        if hmac.compare_digest(_sign(secret, payload_b64), sig):
            ok = True
    if not ok:
        raise AuthError("bad_signature", "Invalid token signature")

    try:
        payload = json.loads(_b64d(payload_b64))
        sub = str(payload["sub"])
        role = str(payload.get("role", "user"))
        iat = float(payload["iat"])
        exp = float(payload["exp"])
        nonce = str(payload["nonce"])
    except Exception:
        raise AuthError("malformed", "Malformed token payload")

    if not sub or len(sub) > 320:
        raise AuthError("malformed", "Invalid subject")
    if exp <= t:
        raise AuthError("expired", "Token expired")
    if iat > t + MAX_CLOCK_SKEW_S:
        raise AuthError("not_yet_valid", "Token issued in the future")
    if exp - iat > MAX_TOKEN_LIFETIME_S:
        raise AuthError("lifetime", "Token lifetime exceeds policy")
    if nonce_cache is not None and not nonce_cache.check_and_add(nonce, exp, t):
        raise AuthError("replay", "Token already used")
    return Identity(sub=sub, role=role, exp=int(exp))


@dataclass
class AuthConfig:
    enforce: bool
    secrets: List[str]
    production: bool

    @classmethod
    def from_env(cls, env: Optional[Dict[str, str]] = None) -> "AuthConfig":
        e = env if env is not None else os.environ
        return cls(
            enforce=e.get("GATEWAY_AUTH_ENFORCE", "0").strip().lower() in ("1", "true", "yes", "on"),
            secrets=parse_secrets(e.get("GATEWAY_SHARED_SECRET")),
            production=e.get("ENV", "").strip().lower() in ("production", "prod"),
        )

    def validate(self) -> None:
        if self.enforce and not self.secrets:
            raise RuntimeError("GATEWAY_AUTH_ENFORCE=1 but GATEWAY_SHARED_SECRET is not set; refusing to start.")
        if self.production and not self.enforce:
            raise RuntimeError("ENV=production requires GATEWAY_AUTH_ENFORCE=1; refusing to start.")


def is_public_path(path: str, method: str) -> bool:
    return method == "OPTIONS" or path in PUBLIC_EXACT
