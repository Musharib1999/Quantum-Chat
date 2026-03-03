"use client";

import React, { useState, useEffect } from 'react';
import { Save, Loader2, Zap, Cpu, AlertCircle, Info } from 'lucide-react';
import axios from 'axios';

const PROVIDER_MODELS = {
    groq: [
        { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B (Versatile)' },
        { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B (Instant)' },
        { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B' },
        { id: 'deepseek-r1-distill-llama-70b', name: 'DeepSeek R1 Llama 70B' },
    ],
    gemini: [
        { id: 'gemini-2.0-flash-lite-preview', name: 'Gemini 2.0 Flash Lite' },
        { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
        { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
        { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
    ]
};

export default function LLMSettingsManager() {
    const [settings, setSettings] = useState({ activeProvider: 'gemini', activeModel: 'gemini-2.0-flash-lite-preview' });
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
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-primary/10 p-6 rounded-2xl border border-primary/20 backdrop-blur-md">
                <h3 className="flex items-center gap-2 font-bold text-primary text-lg">
                    <Zap size={24} /> Hybrid LLM Infrastructure
                </h3>
                <p className="text-muted-foreground text-sm mt-1">
                    Toggle the brain of Quantum Guru. This setting affects all AI features across the platform.
                </p>
            </div>

            <div className="bg-card/70 backdrop-blur-md p-8 rounded-2xl border border-border shadow-xl space-y-8">
                {/* Provider Selection */}
                <div>
                    <label className="text-sm font-bold text-muted-foreground uppercase mb-4 block tracking-wider">Active Provider</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button
                            onClick={() => setSettings({ ...settings, activeProvider: 'groq', activeModel: PROVIDER_MODELS.groq[0].id })}
                            className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 active:scale-95 ${settings.activeProvider === 'groq'
                                ? 'border-orange-500 bg-orange-500/10 text-orange-500 shadow-lg shadow-orange-500/10'
                                : 'border-border bg-secondary/20 grayscale opacity-60 hover:opacity-100 hover:grayscale-0'
                                }`}
                        >
                            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Groq_logo.svg/1024px-Groq_logo.svg.png" className="h-6 object-contain" alt="Groq"
                                onError={(e) => { (e.target as any).src = "https://groq.com/wp-content/uploads/2023/12/GROQ_Logo_Horizontal_White.png" }}
                            />
                            <span className="font-bold text-lg">GROQ (Llama)</span>
                            <span className="text-[10px] uppercase tracking-widest font-mono font-bold">Ultra Low Latency</span>
                        </button>

                        <button
                            onClick={() => setSettings({ ...settings, activeProvider: 'gemini', activeModel: PROVIDER_MODELS.gemini[0].id })}
                            className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 active:scale-95 ${settings.activeProvider === 'gemini'
                                ? 'border-blue-500 bg-blue-500/10 text-blue-500 shadow-lg shadow-blue-500/10'
                                : 'border-border bg-secondary/20 grayscale opacity-60 hover:opacity-100 hover:grayscale-0'
                                }`}
                        >
                            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Google_Gemini_logo.svg/1024px-Google_Gemini_logo.svg.png" className="h-6 object-contain" alt="Gemini" />
                            <span className="font-bold text-lg">Google Gemini</span>
                            <span className="text-[10px] uppercase tracking-widest font-mono font-bold">Advanced Reasoning</span>
                        </button>
                    </div>
                </div>

                {/* Model Selection */}
                <div className="pt-6 border-t border-border/50">
                    <label className="text-sm font-bold text-muted-foreground uppercase mb-4 block tracking-wider">Model Selection</label>
                    <div className="relative">
                        <select
                            value={settings.activeModel}
                            onChange={(e) => setSettings({ ...settings, activeModel: e.target.value })}
                            className="w-full p-4 bg-secondary/30 border border-border rounded-xl text-foreground font-medium appearance-none focus:ring-2 focus:ring-primary outline-none transition-all cursor-pointer"
                        >
                            {PROVIDER_MODELS[settings.activeProvider as keyof typeof PROVIDER_MODELS].map(model => (
                                <option key={model.id} value={model.id} className="bg-card text-foreground">
                                    {model.name} ({model.id})
                                </option>
                            ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                            <Cpu size={18} />
                        </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground bg-secondary/20 p-3 rounded-lg border border-border/50">
                        <Info size={14} className="text-primary" />
                        <span>Changing the model will reset active conversation contexts on refresh.</span>
                    </div>
                </div>

                {/* Status & Save */}
                <div className="pt-6 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {status === 'success' && (
                            <div className="flex items-center gap-1.5 text-green-500 text-sm font-bold bg-green-500/10 px-3 py-1.5 rounded-full border border-green-500/20">
                                <Zap size={14} fill="currentColor" /> Settings Saved Live
                            </div>
                        )}
                        {status === 'error' && (
                            <div className="text-red-400 text-sm flex items-center gap-1.5 font-bold">
                                <AlertCircle size={16} /> Error saving settings
                            </div>
                        )}
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20 active:scale-95 transition-all disabled:opacity-50"
                    >
                        {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                        Deploy Core Configuration
                    </button>
                </div>
            </div>
        </div>
    );
}
