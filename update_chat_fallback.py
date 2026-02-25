import re

with open('src/app/actions/chat.ts', 'r') as f:
    content = f.read()

# Refine error handling and fallback
fallback_logic = """
    } catch (error: any) {
        console.error("Groq Server Error:", error);

        // Fallback: If we hit a rate limit but we successfully fetched market data, return that data directly.
        let fallbackText = "";
        if (autonomousMarketData) {
            fallbackText += `⚠️ **Notice: Deep AI Analysis is currently unavaliable.**\\n\\nHowever, I retrieved the raw market data you requested:\\n\\n**${autonomousMarketData.symbol}**\\n- **Price:** $${autonomousMarketData.price}\\n- **Change:** ${autonomousMarketData.change} (${autonomousMarketData.changePercent})\\n- **Volume:** ${autonomousMarketData.volume}\\n- **Previous Close:** $${autonomousMarketData.previousClose}\\n\\n`;
        }

        if (autonomousNewsData && autonomousNewsData.length > 0) {
            fallbackText += `**Latest Headlines:**\\n`;
            autonomousNewsData.slice(0, 3).forEach((n: any) => {
                fallbackText += `- [${n.title}](${n.url || '#'}) (${n.source})\\n`;
            });
        }

        if (fallbackText) {
            // We have fallback data to show
            return {
                text: fallbackText,
                source: 'fallback_market_data',
                guardrailsStatus: 'passed',
                activeGuardrails: ruleTexts
            };
        }

        // Basic offline fallback
        const errorMsg = "I am currently undergoing maintenance and cannot process complex requests right now. However, you can still ask me questions from our official Knowledge Base, or try again in a few minutes.";
        await ChatLog.create({
            userQuery: prompt,
            aiResponse: errorMsg,
            source: 'error',
            guardrailsStatus: 'passed', // Logic still passed guardrails
            activeGuardrails: ruleTexts
        });

        return {
            text: errorMsg,
            error: error.message || "LLM_OFFLINE",
            source: 'error',
            guardrailsStatus: 'passed',
            activeGuardrails: ruleTexts
        };
    }
"""

start_marker = "    } catch (error: any) {"
end_marker = "}\n\nexport async function getMarketNews() {"

start_index = content.find(start_marker)
end_index = content.find(end_marker)

if start_index != -1 and end_index != -1:
    new_content = content[:start_index] + fallback_logic + content[end_index:]
    with open('src/app/actions/chat.ts', 'w') as f:
        f.write(new_content)
    print("Replaced Fallback Logic")
else:
    print("Failed to find markers for replacement")
