"""
Execution Logger — QuantumGuru Engine v3
Logs all model inputs/outputs to a persistent log file and MongoDB systemlogs.
"""
import os
import datetime
import threading

# Log path: default to /AI-Service/model_engagement.log with fallback to local path
LOG_FILE_PATH = os.environ.get("MODEL_LOG_PATH", "/AI-Service/model_engagement.log")

# Fallback check
dir_name = os.path.dirname(LOG_FILE_PATH)
if dir_name and not os.path.exists(dir_name):
    LOG_FILE_PATH = "./model_engagement.log"

# ── Singleton MongoDB connection pool ─────────────────────────────────────
# One pool of up to 5 connections reused by all daemon threads.
# Prevents Atlas connection exhaustion at scale.
_mongo_lock = threading.Lock()
_mongo_client = None
_mongo_db = None

def _get_mongo_db():
    global _mongo_client, _mongo_db
    if _mongo_db is not None:
        return _mongo_db
    with _mongo_lock:
        if _mongo_db is not None:
            return _mongo_db
        MONGODB_URI = os.environ.get("MONGODB_URI", "")
        if not MONGODB_URI:
            return None
        try:
            import pymongo
            _mongo_client = pymongo.MongoClient(
                MONGODB_URI,
                maxPoolSize=5,
                minPoolSize=1,
                serverSelectionTimeoutMS=3000,
                connectTimeoutMS=3000,
                tlsAllowInvalidCertificates=True,
            )
            try:
                db = _mongo_client.get_default_database()
            except Exception:
                db = _mongo_client["quantum_guru"]
            if db is None:
                db = _mongo_client["quantum_guru"]
            _mongo_db = db
            print("[ExecutionLogger] MongoDB connection pool initialised (maxPoolSize=5)")
        except Exception as e:
            print(f"[ExecutionLogger] MongoDB connection failed: {e}")
    return _mongo_db


def _db_log_worker(model_type: str, system_prompt: str, user_prompt: str, response: str, error: str, user_id: str):
    db = _get_mongo_db()
    if db is None:
        return
    try:
        log_doc = {
            "service": "engine",
            "logType": "model_engagement",
            "userId": user_id,
            "message": f"vLLM Engagement - {model_type}",
            "metadata": {
                "model": model_type,
                # Truncate prompts to protect IP and keep capped collection docs small
                "systemPrompt": (system_prompt or "")[:300],
                "userPrompt": (user_prompt or "")[:300],
                "response": (response or "")[:500],
                "error": error
            },
            "timestamp": datetime.datetime.utcnow()
        }
        db["systemlogs"].insert_one(log_doc)
    except Exception as e:
        print(f"[ExecutionLogger DB Thread] Error writing DB log: {e}")

def log_engagement(model_type: str, system_prompt: str, user_prompt: str, response: str, error: str = None, user_id: str = None):
    """
    Log an LLM execution to a formatted log file and asynchronously to MongoDB.
    """
    timestamp = datetime.datetime.utcnow().isoformat() + "Z"
    
    divider = "=" * 80
    sub_divider = "-" * 80
    
    log_entry = (
        f"{divider}\n"
        f"TIMESTAMP: {timestamp} | MODEL ENGAGED: {model_type}\n"
        f"{sub_divider}\n"
        f"SYSTEM PROMPT:\n{system_prompt}\n\n"
        f"USER PROMPT:\n{user_prompt}\n\n"
        f"RESPONSE:\n{response}\n"
    )
    if error:
        log_entry += f"\nERROR DETAILS:\n{error}\n"
    log_entry += f"{divider}\n\n"
    
    # 1. Write to local file
    try:
        with open(LOG_FILE_PATH, "a", encoding="utf-8") as f:
            f.write(log_entry)
    except Exception as e:
        print(f"[ExecutionLogger] Failed to write log to {LOG_FILE_PATH}: {e}")

    # 2. Write to MongoDB in background thread (non-blocking)
    if os.environ.get("MONGODB_URI"):
        t = threading.Thread(
            target=_db_log_worker,
            args=(model_type, system_prompt, user_prompt, response, error, user_id),
            daemon=True
        )
        t.start()
