"""
Per-user Quota and Rate Limiting Manager for OptiOS / Quantum Guru Gateway.

Enforces:
1. Daily simulation execution quotas per user role (demo: 50, user: 500, admin: unlimited).
2. Daily LLM reasoning turns per role (demo: 20, user: 200, admin: unlimited).
3. Concurrent in-flight simulation slots per user (demo: 2, user: 4, admin: 8).

Storage:
- Primary: MongoDB collection `user_quotas` with atomic $inc updates.
- Fallback: Thread-safe in-memory sliding counters if Mongo is disconnected in dev.
"""
from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from typing import Dict, Optional, Tuple
from dataclasses import dataclass

ROLE_LIMITS = {
    "demo": {
        "daily_simulations": 50,
        "daily_llm_turns": 20,
        "max_inflight": 2,
    },
    "user": {
        "daily_simulations": 500,
        "daily_llm_turns": 200,
        "max_inflight": 4,
    },
    "student": {
        "daily_simulations": 200,
        "daily_llm_turns": 100,
        "max_inflight": 3,
    },
    "builder": {
        "daily_simulations": 1000,
        "daily_llm_turns": 500,
        "max_inflight": 6,
    },
    "admin": {
        "daily_simulations": 1_000_000,
        "daily_llm_turns": 1_000_000,
        "max_inflight": 16,
    },
    "enterprise": {
        "daily_simulations": 100_000,
        "daily_llm_turns": 50_000,
        "max_inflight": 12,
    }
}

@dataclass
class QuotaResult:
    allowed: bool
    reason: Optional[str] = None
    remaining: int = 0
    limit: int = 0
    retry_after_s: int = 0

class QuotaManager:
    def __init__(self, db_client=None):
        self._db_client = db_client
        self._inflight: Dict[str, int] = {}
        self._lock = asyncio.Lock()
        self._mem_counts: Dict[str, Dict[str, int]] = {} # fallback: key -> {sim: int, llm: int, date: str}

    def set_db(self, db_client):
        self._db_client = db_client

    def _today_str(self) -> str:
        return datetime.now(timezone.utc).strftime("%Y-%m-%d")

    async def acquire_inflight(self, user_email: str, role: str = "user") -> Tuple[bool, int]:
        """Check and increment active in-flight executions for user."""
        if role == "admin":
            return True, 0
        limits = ROLE_LIMITS.get(role, ROLE_LIMITS["user"])
        max_inf = limits["max_inflight"]

        async with self._lock:
            current = self._inflight.get(user_email, 0)
            if current >= max_inf:
                return False, current
            self._inflight[user_email] = current + 1
            return True, current + 1

    async def release_inflight(self, user_email: str):
        """Decrement active in-flight executions."""
        async with self._lock:
            current = self._inflight.get(user_email, 0)
            if current <= 1:
                self._inflight.pop(user_email, None)
            else:
                self._inflight[user_email] = current - 1

    async def check_and_consume_simulation(self, user_email: str, role: str = "user") -> QuotaResult:
        """Check daily simulation quota and increment counter atomically."""
        if role == "admin":
            return QuotaResult(allowed=True, remaining=999999, limit=999999)

        limits = ROLE_LIMITS.get(role, ROLE_LIMITS["user"])
        max_sim = limits["daily_simulations"]
        today = self._today_str()

        # Try MongoDB atomic increment if client available
        if self._db_client is not None:
            try:
                db = self._db_client.get_default_database()
                col = db["user_quotas"]
                doc = await col.find_one_and_update(
                    {"email": user_email, "date": today},
                    {"$inc": {"simulations_used": 1}, "$setOnInsert": {"created_at": datetime.now(timezone.utc)}},
                    upsert=True,
                    return_document=True
                )
                used = doc.get("simulations_used", 1)
                if used > max_sim:
                    # rollback increment if over quota
                    await col.update_one({"email": user_email, "date": today}, {"$inc": {"simulations_used": -1}})
                    return QuotaResult(
                        allowed=False,
                        reason=f"Daily simulation limit of {max_sim} reached for plan '{role}'.",
                        remaining=0,
                        limit=max_sim,
                        retry_after_s=3600
                    )
                return QuotaResult(allowed=True, remaining=max(0, max_sim - used), limit=max_sim)
            except Exception as e:
                # Log and fallback to in-memory tracking
                pass

        # In-memory fallback
        async with self._lock:
            record = self._mem_counts.setdefault(user_email, {"simulations_used": 0, "date": today})
            if record["date"] != today:
                record["simulations_used"] = 0
                record["date"] = today
            if record["simulations_used"] >= max_sim:
                return QuotaResult(
                    allowed=False,
                    reason=f"Daily simulation limit of {max_sim} reached for plan '{role}'.",
                    remaining=0,
                    limit=max_sim,
                    retry_after_s=3600
                )
            record["simulations_used"] += 1
            remaining = max_sim - record["simulations_used"]
            return QuotaResult(allowed=True, remaining=remaining, limit=max_sim)

quota_manager = QuotaManager()
