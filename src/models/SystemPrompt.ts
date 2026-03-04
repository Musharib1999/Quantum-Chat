import mongoose from 'mongoose';

const SystemPromptSchema = new mongoose.Schema({
    category: {
        type: String,
        required: true,
        unique: true,
        enum: [
            'general_conversation',
            'market_inquiry',
            'article_inquiry',
            'news_automation',
            'industry_dwave',
            'industry_qiskit',
            'industry_analysis',
            'ai_router',
            'ticker_extraction',
            'assistant_mode',
            'industry_json_wrapper',
            'industry_template_fill',
            'news_geo_backfill',
            'market_news_fallback'
        ],
        description: 'The internal ID for the prompt category'
    },
    title: {
        type: String,
        required: true,
        description: 'Human readable title for the Admin UI'
    },
    template: {
        type: String,
        required: true,
        description: 'The actual prompt template containing {{placeholders}}'
    },
    description: {
        type: String,
        description: 'Optional admin notes about what this prompt handles'
    },
    availableTags: {
        type: [String],
        description: 'List of tags like {{price}} that the code will replace'
    }
}, { timestamps: true });

export default mongoose.models.SystemPrompt || mongoose.model('SystemPrompt', SystemPromptSchema);
