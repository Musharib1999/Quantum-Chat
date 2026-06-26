import sys

def patch_file():
    with open('main.py', 'r') as f:
        content = f.read()

    # 1. Update run_mlx_expert to support temp
    old_func = """def run_mlx_expert(prompt: str, adapter_path: str, max_tokens: int = 800, model_path: str = None) -> str:
    \"\"\"
    Runs a specific LoRA adapter.
    Accepts an optional model_path to support adapters trained on different base models.
    Because MLX uses memory-mapped safetensors, the 4.5GB base model 
    is shared in RAM across all calls, making this extremely efficient!
    \"\"\"
    base = model_path if model_path else BASE_MODEL
    cmd = [
        "mlx_lm.generate",
        "--model", base,
        "--adapter-path", adapter_path,
        "--prompt", prompt,
        "--max-tokens", str(max_tokens),
        "--temp", "0",
        "--extra-eos-token", "<|eot_id|>"
    ]"""
    
    new_func = """def run_mlx_expert(prompt: str, adapter_path: str, max_tokens: int = 800, model_path: str = None, temp: float = 0.0) -> str:
    \"\"\"
    Runs a specific LoRA adapter.
    Accepts an optional model_path to support adapters trained on different base models.
    Because MLX uses memory-mapped safetensors, the 4.5GB base model 
    is shared in RAM across all calls, making this extremely efficient!
    \"\"\"
    base = model_path if model_path else BASE_MODEL
    cmd = [
        "mlx_lm.generate",
        "--model", base,
        "--adapter-path", adapter_path,
        "--prompt", prompt,
        "--max-tokens", str(max_tokens),
        "--temp", str(temp),
        "--extra-eos-token", "<|eot_id|>"
    ]"""
    content = content.replace(old_func, new_func)

    # 2. Update assistant_chat
    old_endpoint = """@app.post("/assistant/chat", response_model=AssistantChatResponse)
async def assistant_chat(request: AssistantChatRequest):
    try:
        if not KNOWLEDGE_ADAPTER or not PERSONALITY_ADAPTER:
            return AssistantChatResponse(response="My MLX neural adapters are not configured.")

        # 1. Run the Knowledge Adapter to get raw technical structure
        technical_prompt = f"Map this constraint: {request.message}"
        technical_response = run_mlx_expert(technical_prompt, KNOWLEDGE_ADAPTER, max_tokens=600, model_path=BASE_MODEL)
        
        # 2. Pass technical output into Personality Adapter
        persona_prompt = f"Adopt Quantum Guru persona to explain: {technical_response}"
        final_response = run_mlx_expert(persona_prompt, PERSONALITY_ADAPTER, max_tokens=800, model_path=BASE_MODEL)
        
        return AssistantChatResponse(response=final_response)"""

    new_endpoint = """@app.post("/assistant/chat", response_model=AssistantChatResponse)
async def assistant_chat(request: AssistantChatRequest):
    try:
        if not KNOWLEDGE_ADAPTER or not PERSONALITY_ADAPTER:
            return AssistantChatResponse(response="My MLX neural adapters are not configured.")

        # Fast-path for identity/conversational questions
        msg_lower = request.message.lower()
        casual_keywords = ['who', 'what is', 'hello', 'hi', 'expertise', 'do for me', 'name', 'develop', 'lamma', 'grok', 'openai', 'are you']
        
        if len(msg_lower) < 150 and any(kw in msg_lower for kw in casual_keywords):
            # Skip technical mapping to save time (cuts response time in half)
            # Increase temperature to 0.6 to fix repetitive answers
            persona_prompt = f"Answer naturally as Quantum Guru (keep it concise): {request.message}"
            final_response = run_mlx_expert(persona_prompt, PERSONALITY_ADAPTER, max_tokens=300, model_path=BASE_MODEL, temp=0.6)
            return AssistantChatResponse(response=final_response)

        # 1. Run the Knowledge Adapter to get raw technical structure
        technical_prompt = f"Map this constraint: {request.message}"
        technical_response = run_mlx_expert(technical_prompt, KNOWLEDGE_ADAPTER, max_tokens=400, model_path=BASE_MODEL, temp=0.1)
        
        # 2. Pass technical output into Personality Adapter (temp=0.4 for varied phrasing)
        persona_prompt = f"Adopt Quantum Guru persona to explain this technical solution: {technical_response}"
        final_response = run_mlx_expert(persona_prompt, PERSONALITY_ADAPTER, max_tokens=600, model_path=BASE_MODEL, temp=0.4)
        
        return AssistantChatResponse(response=final_response)"""
    
    content = content.replace(old_endpoint, new_endpoint)

    with open('main.py', 'w') as f:
        f.write(content)

patch_file()
