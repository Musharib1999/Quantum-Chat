with open("scripts/runpod_start.sh", "r") as f:
    content = f.read()

# Replace model ID
content = content.replace("Qwen/Qwen2.5-32B-Instruct-AWQ", "neuralmagic/Qwen2.5-32B-Instruct-FP8")

# Remove AWQ quantization flag
content = content.replace("  --quantization awq \\\n", "")

with open("scripts/runpod_start.sh", "w") as f:
    f.write(content)
