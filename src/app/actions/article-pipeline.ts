/**
 * Dependencies injected from chat.ts to avoid circular imports 
 * and avoid initializing heavy LLM SDKs multiple times.
 */
interface ArticlePipelineDeps {
    getDynamicPrompt: (category: string, replacements: Record<string, any>, fallback: string) => Promise<string>;
    scrapeUrl: (url: string) => Promise<string | null>;
}

export async function buildArticleContext(
    contextConfig: any,
    deps: ArticlePipelineDeps
): Promise<{ systemInstructions: string }> {
    const { getDynamicPrompt, scrapeUrl } = deps;

    let autonomousContext = "";
    let systemInstructions = "";

    // 1. Extract Web Content if URL is provided
    if (contextConfig.articleUrl) {
        const scrapedData = await scrapeUrl(contextConfig.articleUrl);
        if (scrapedData) {
            autonomousContext = scrapedData;
        }
    }

    // 2. Finalize System Prompt Assembly
    // Override ALL system instructions with the Article mode prompt (which is how the original worked)
    systemInstructions = await getDynamicPrompt('article_inquiry', {
        title: contextConfig.articleTitle || 'Provided Context',
        category: contextConfig.articleCategory || 'General',
        url: contextConfig.articleUrl || 'N/A',
        scrapedData: autonomousContext ? `\nREFERENCE CONTEXT:\n${autonomousContext}\n` : ''
    }, systemInstructions); // fallback

    return { systemInstructions };
}
