with open("src/app/actions/chat.ts", "r") as f:
    content = f.read()

old_response_logic = """                const data = backendRes.data;
                
                const responseText = data.personality_response + (data.final_code ? `\\n\\n[STEP_CODE]\\n${data.final_code}\\n[/STEP_CODE]` : "");"""

new_response_logic = """                const data = backendRes.data;
                
                let responseText = (data.personality_response || "") + (data.final_code ? `\\n\\n[STEP_CODE]\\n${data.final_code}\\n[/STEP_CODE]` : "");
                if (!responseText.trim()) {
                    responseText = "⚠️ The Council of Experts completed the pipeline but generated an empty response. Check backend logs for parsing errors.";
                }"""

if old_response_logic in content:
    content = content.replace(old_response_logic, new_response_logic)
    with open("src/app/actions/chat.ts", "w") as f:
        f.write(content)
    print("Fixed empty responseText logic.")
else:
    print("Could not find the target logic in chat.ts")
