with open("scripts/runpod_start.sh", "r") as f:
    content = f.read()

# Add export HF_HOME before vllm starts
new_export = "export HF_HOME=/workspace/huggingface_cache\n\n"
if "export HF_HOME" not in content:
    content = content.replace("echo \"Starting vLLM Inference Engine", new_export + "echo \"Starting vLLM Inference Engine")

with open("scripts/runpod_start.sh", "w") as f:
    f.write(content)
