/**
 * Dependencies injected from chat.ts.
 */
interface AssistantPipelineDeps {
    getDynamicPrompt: (category: string, replacements: Record<string, any>, fallback: string) => Promise<string>;
}

export async function buildAssistantContext(
    deps: AssistantPipelineDeps
): Promise<{ systemInstructions: string }> {
    const { getDynamicPrompt } = deps;

    const systemInstructions = await getDynamicPrompt(
        'assistant_mode',
        {},
        `MODE: GENERAL CHAT AND ASSISTANCE CONTEXT\nTASK: You are providing general chat and assistance. Answer the user's questions to the best of your ability. Keep responses helpful and professional.`
    );

    return { systemInstructions };
}
