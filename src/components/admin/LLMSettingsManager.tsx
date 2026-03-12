"use client";

import React, { useState, useEffect } from 'react';
import axios from 'axios';

const PROVIDER_MODELS = {
    groq: [
        { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B (Versatile)' },
        { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B (Instant)' },
        { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B' },
        { id: 'deepseek-r1-distill-llama-70b', name: 'DeepSeek R1 Llama 70B' },
    ],
    gemini: [
        { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash Lite' },
        { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
        { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
        { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
    ]
};

export default function LLMSettingsManager() {
    const [settings, setSettings] = useState({ activeProvider: 'gemini', activeModel: 'gemini-2.0-flash-lite' });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await axios.get('/api/admin/llm-settings');
            setSettings({
                activeProvider: res.data.activeProvider,
                activeModel: res.data.activeModel
            });
        } catch (error) {
            console.error("Failed to fetch LLM settings", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setStatus('idle');
        try {
            await axios.post('/api/admin/llm-settings', settings);
            setStatus('success');
            setTimeout(() => setStatus('idle'), 3000);
        } catch (error) {
            setStatus('error');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="text-slate-400 text-sm">Loading infrastructure settings...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-slate-900">Core intelligence configuration</h2>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-8">
                {/* Provider Selection */}
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-4 block tracking-wider">Active intelligence provider</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button
                            onClick={() => setSettings({ ...settings, activeProvider: 'groq', activeModel: PROVIDER_MODELS.groq[0].id })}
                            className={`p-6 rounded-2xl border transition-all flex flex-col items-center gap-3 ${settings.activeProvider === 'groq'
                                ? 'border-[#3066bb] bg-[#3066bb]/5 text-[#3066bb]'
                                : 'border-slate-100 bg-slate-50 text-slate-400 opacity-60 hover:opacity-100 hover:bg-slate-100'
                                }`}
                        >
                            <span className="font-bold text-lg">Groq / Llama</span>
                            <span className="text-[10px] uppercase tracking-widest font-semibold">Low latency execution</span>
                        </button>

                        <button
                            onClick={() => setSettings({ ...settings, activeProvider: 'gemini', activeModel: PROVIDER_MODELS.gemini[0].id })}
                            className={`p-6 rounded-2xl border transition-all flex flex-col items-center gap-3 ${settings.activeProvider === 'gemini'
                                ? 'border-[#3066bb] bg-[#3066bb]/5 text-[#3066bb]'
                                : 'border-slate-100 bg-slate-50 text-slate-400 opacity-60 hover:opacity-100 hover:bg-slate-100'
                                }`}
                        >
                            <span className="font-bold text-lg">Google Gemini</span>
                            <span className="text-[10px] uppercase tracking-widest font-semibold">Advanced reasoning engine</span>
                        </button>
                    </div>
                </div>

                {/* Model Selection */}
                <div className="pt-6 border-t border-slate-100">
                    <label className="text-xs font-bold text-slate-500 uppercase mb-4 block tracking-wider">Specific model architecture</label>
                    <select
                        value={settings.activeModel}
                        onChange={(e) => setSettings({ ...settings, activeModel: e.target.value })}
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium outline-none focus:ring-1 focus:ring-[#3066bb] transition-all cursor-pointer text-sm"
                    >
                        {PROVIDER_MODELS[settings.activeProvider as keyof typeof PROVIDER_MODELS].map(model => (
                            <option key={model.id} value={model.id}>
                                {model.name}
                            </option>
                        ))}
                    </select>
                    <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <span>Changing the model architecture will affect system accuracy and response speed across the entire platform.</span>
                    </div>
                </div>

                {/* Status & Save */}
                <div className="pt-6 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {status === 'success' && (
                            <div className="text-green-600 text-xs font-bold px-3 py-1 bg-green-50 rounded-full border border-green-100">
                                Configuration deployed successfully
                            </div>
                        )}
                        {status === 'error' && (
                            <div className="text-red-500 text-xs font-bold px-3 py-1 bg-red-50 rounded-full border border-red-100">
                                Error deploying configuration
                            </div>
                        )}
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-[#3066bb] hover:bg-[#255299] text-white px-8 py-3.5 rounded-xl font-bold transition-all shadow-sm disabled:opacity-50 text-sm"
                    >
                        {saving ? 'Deploying...' : 'Deploy core configuration'}
                    </button>
                </div>
            </div>
        </div>
    );
}
