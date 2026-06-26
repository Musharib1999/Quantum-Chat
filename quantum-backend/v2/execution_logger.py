"""
Execution Logger — QuantumGuru Engine v2
Logs all model inputs/outputs to a persistent log file.
"""
import os
import datetime

# Log path: default to /AI-Service/model_engagement.log with fallback to local path
LOG_FILE_PATH = os.environ.get("MODEL_LOG_PATH", "/AI-Service/model_engagement.log")

# Fallback check
dir_name = os.path.dirname(LOG_FILE_PATH)
if dir_name and not os.path.exists(dir_name):
    # If the directory doesn't exist, log to current directory
    LOG_FILE_PATH = "./model_engagement.log"

def log_engagement(model_type: str, system_prompt: str, user_prompt: str, response: str, error: str = None):
    """
    Log an LLM execution to a formatted log file.
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
    
    try:
        with open(LOG_FILE_PATH, "a", encoding="utf-8") as f:
            f.write(log_entry)
    except Exception as e:
        print(f"[ExecutionLogger] Failed to write log to {LOG_FILE_PATH}: {e}")
