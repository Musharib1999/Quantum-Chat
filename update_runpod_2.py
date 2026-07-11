with open("scripts/runpod_start.sh", "r") as f:
    content = f.read()

# Replace wrong model ID with Predibase's official FP8 Qwen
content = content.replace("neuralmagic/Qwen2.5-32B-Instruct-FP8", "predibase/Qwen2.5-32B-Instruct-FP8")

with open("scripts/runpod_start.sh", "w") as f:
    f.write(content)
