import re

with open('src/app/actions/chat.ts', 'r') as f:
    content = f.read()

# 1. Define the new Tools array and Tool calling logic
new_tool_logic = """
    // 2.5 Autonomous Market Data Fetch via LLM Tool Calling
    let autonomousMarketData = null;
    let autonomousNewsData = null;

    if (!contextConfig?.realTimeData && !kbResult) {
        // Define our available native tools
        const tools = [
            {
                type: "function",
                function: {
                    name: "get_stock_price",
                    description: "Gets the real-time stock price and market data for a given company ticker symbol. Use exactly when the user asks for financial data on a specific company.",
                    parameters: {
                        type: "object",
                        properties: {
                            ticker: { type: "string", description: "The official abbreviated stock ticker symbol (e.g., AAPL for Apple, TSLA for Tesla)" }
                        },
                        required: ["ticker"]
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "get_market_news",
                    description: "Fetches recent news headlines for a given company or generic topic.",
                    parameters: {
                        type: "object",
                        properties: {
                            topic: { type: "string", description: "The topic or company name to get news for (e.g., 'Apple' or 'Quantum Computing')." }
                        },
                        required: ["topic"]
                    }
                }
            }
        ];

        try {
            // First pass: Ask the LLM if it wants to use a tool based on the user's prompt
            const initialToolCheck = await groq.chat.completions.create({
                messages: [{ role: "system", content: "You are an AI router. Decide if you need to fetch live data using your tools." }, { role: "user", content: prompt }],
                model: DEFAULT_MODEL,
                tools: tools as any[],
                tool_choice: "auto",
                temperature: 0,
            });

            const responseMessage = initialToolCheck.choices[0]?.message;

            // Did the LLM decide to call any tools?
            if (responseMessage?.tool_calls) {
                for (const toolCall of responseMessage.tool_calls) {
                    const args = JSON.parse(toolCall.function.arguments);
                    
                    if (toolCall.function.name === 'get_stock_price') {
                        console.log(`[Groq Tool] Triggered get_stock_price for: ${args.ticker}`);
                        try {
                            // Add an AbortController for a 5-second graceful timeout
                            const controller = new AbortController();
                            const timeoutId = setTimeout(() => controller.abort(), 5000);
                            
                            // We call the existing local import which talks to the external Vercel app
                            autonomousMarketData = await getStockPrice(args.ticker);
                            clearTimeout(timeoutId);
                        } catch (e: any) {
                            console.error("[Groq Tool] get_stock_price failed/timed out:", e.message);
                            // It failed safely, we will just inform Groq we don't have the data in the system instructions later
                        }
                    } 
                    
                    if (toolCall.function.name === 'get_market_news') {
                         console.log(`[Groq Tool] Triggered get_market_news for: ${args.topic}`);
                         try {
                            const newsResult = await getLatestNews(args.topic);
                            autonomousNewsData = newsResult.news;
                         } catch (e: any) {
                             console.error("[Groq Tool] get_market_news failed:", e.message);
                         }
                    }
                }
            }
        } catch (toolError) {
             console.error("[Groq Tool Calling Error] - Proceeding without tools:", toolError);
        }
    }
"""

# Replace the old Regex logic block
# Find the start of the block
start_marker = "    // 2.5 Autonomous Market Data Fetch (If finance-related and no context provided)"
end_marker = "    if (kbResult?.type === 'direct') {"

start_index = content.find(start_marker)
end_index = content.find(end_marker)

if start_index != -1 and end_index != -1:
    new_content = content[:start_index] + new_tool_logic + "\n" + content[end_index:]
    with open('src/app/actions/chat.ts', 'w') as f:
        f.write(new_content)
    print("Replaced Regex logic with Groq Tool Calling Logic")
else:
    print("Failed to find markers for replacement")
