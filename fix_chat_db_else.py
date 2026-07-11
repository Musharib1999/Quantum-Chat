with open("src/app/actions/chat.ts", "r") as f:
    content = f.read()

old_else_logic = """                const data = backendRes.data;
                
                const responseText = data.response;
                const workflowSteps = {"""

new_else_logic = """                const data = backendRes.data;
                
                let responseText = data.response || "";
                if (!responseText.trim()) {
                    responseText = "⚠️ The Qwen 32B model completed generation but returned an empty response. This occasionally happens with the AWQ quantized model.";
                }
                const workflowSteps = {"""

if old_else_logic in content:
    content = content.replace(old_else_logic, new_else_logic)
    with open("src/app/actions/chat.ts", "w") as f:
        f.write(content)
    print("Fixed empty responseText logic in else block.")
else:
    print("Could not find the target logic in chat.ts")
