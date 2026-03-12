"use client";

import React, { useState, useEffect } from 'react';
import { Save, AlertCircle, RefreshCw, CheckCircle2, FileText, Code } from 'lucide-react';

interface SystemPrompt {
    _id: string;
    category: string;
    title: string;
    description: string;
    template: string;
    availableTags: string[];
    updatedAt: string;
}

export default function PromptEditor() {
    const isDarkMode = false;

    const [prompts, setPrompts] = useState<SystemPrompt[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [currentTemplate, setCurrentTemplate] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        fetchPrompts();
    }, []);

    const fetchPrompts = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/admin/prompts');
            const data = await res.json();
            if (data.success && data.data.length > 0) {
                setPrompts(data.data);
                // Select first one by default
                setSelectedCategory(data.data[0].category);
                setCurrentTemplate(data.data[0].template);
            }
        } catch (error) {
            console.error("Failed to load prompts:", error);
            setStatusMessage({ type: 'error', text: 'Failed to load system prompts from database.' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const cat = e.target.value;
        setSelectedCategory(cat);
        const selectedPrompt = prompts.find(p => p.category === cat);
        if (selectedPrompt) {
            setCurrentTemplate(selectedPrompt.template);
            setStatusMessage(null); // clear messages on switch
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        setStatusMessage(null);
        try {
            const res = await fetch('/api/admin/prompts', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    category: selectedCategory,
                    template: currentTemplate
                })
            });
            const data = await res.json();

            if (data.success) {
                setStatusMessage({ type: 'success', text: 'Prompt updated successfully! Changes are live.' });
                // Update local state to reflect save
                setPrompts(prompts.map(p => p.category === selectedCategory ? { ...p, template: currentTemplate } : p));
            } else {
                throw new Error(data.error || 'Failed to update prompt');
            }
        } catch (error: any) {
            setStatusMessage({ type: 'error', text: error.message });
        } finally {
            setIsSaving(false);
            setTimeout(() => setStatusMessage(null), 5000); // clear success after 5s
        }
    };

    const activePrompt = prompts.find(p => p.category === selectedCategory);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-zinc-500">
                <RefreshCw size={24} className="animate-spin mb-4" />
                <p>Loading System AI Instructions...</p>
            </div>
        );
    }

    if (prompts.length === 0) {
        return (
            <div className="p-8 text-center rounded-lg border border-slate-200 text-slate-500 bg-white">
                <AlertCircle size={40} className="mx-auto mb-4 opacity-50" />
                <h3 className="text-xl font-medium mb-2 text-slate-900">No Prompts Found</h3>
                <p>The database seed script needs to run to initialize the base prompts.</p>
                <button onClick={fetchPrompts} className="mt-4 px-4 py-2 bg-[#3066bb] hover:bg-[#255299] text-white rounded">Retry Connection</button>
            </div>
        );
    }

    return (
        <div className="border rounded-xl overflow-hidden shadow-sm bg-white border-slate-200">
            <div className="p-6 border-b flex justify-between items-center sm:flex-row flex-col gap-4 border-slate-100">
                <div>
                    <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900">
                        <Code className="text-[#3066bb]" size={24} />
                        Dynamic System Instructions
                    </h2>
                    <p className="text-sm mt-1 text-slate-500">Control exactly how the AI behaves and structures responses for different modules.</p>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <select
                        className="text-sm rounded-lg border block w-full sm:w-64 p-2.5 outline-none bg-slate-50 border-slate-200 text-slate-900 focus:border-[#3066bb]"
                        value={selectedCategory}
                        onChange={handleCategoryChange}
                    >
                        {prompts.map(p => (
                            <option key={p._id} value={p.category}>{p.title}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="flex flex-col md:flex-row h-full md:h-[600px] divide-y md:divide-y-0 md:divide-x divide-slate-100">
                {/* Left Panel: Editor */}
                <div className="flex-1 flex flex-col p-6 relative bg-slate-50/50">
                    <div className="flex justify-between items-center mb-3">
                        <label className="text-sm font-medium text-slate-700">Prompt Template</label>
                        {statusMessage && (
                            <div className={`text-xs px-3 py-1 rounded flex items-center gap-1.5 animate-in fade-in ${statusMessage.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                {statusMessage.type === 'success' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                                {statusMessage.text}
                            </div>
                        )}
                    </div>

                    <textarea
                        className="flex-1 w-full border rounded-lg p-4 font-mono text-sm leading-relaxed resize-none focus:outline-none focus:border-[#3066bb] transition-colors scrollbar-thin bg-white border-slate-200 text-slate-700 scrollbar-thumb-slate-300"
                        value={currentTemplate}
                        onChange={(e) => setCurrentTemplate(e.target.value)}
                        placeholder="Enter the underlying system prompt instructions here..."
                    />

                    <div className="mt-4 flex justify-end">
                        <button
                            onClick={handleSave}
                            disabled={isSaving || currentTemplate === activePrompt?.template}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded text-sm font-medium transition-all ${currentTemplate === activePrompt?.template
                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                    : 'bg-[#3066bb] hover:bg-[#255299] text-white shadow-sm'
                                }`}
                        >
                            {isSaving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                            {isSaving ? 'Saving...' : 'Save Live Changes'}
                        </button>
                    </div>
                </div>

                {/* Right Panel: Helper Context */}
                <div className="w-full md:w-80 p-6 flex flex-col bg-white">
                    <h3 className="font-medium mb-2 flex items-center gap-2 text-slate-900">
                        <FileText size={16} className="text-slate-500" />
                        Variables Required
                    </h3>
                    <p className="text-xs mb-6 text-slate-500">
                        The backend code injects real-time data into this prompt. You <strong>must</strong> include the following tags in your text to prevent application errors.
                    </p>

                    <div className="space-y-3 overflow-y-auto scrollbar-thin pr-2 scrollbar-thumb-slate-300">
                        {activePrompt?.availableTags.map(tag => (
                            <div key={tag} className="flex flex-col gap-1 p-3 border rounded bg-slate-50 border-slate-100">
                                <code className="text-[#3066bb] text-xs font-bold">{tag}</code>
                            </div>
                        ))}
                        {(!activePrompt?.availableTags || activePrompt.availableTags.length === 0) && (
                            <div className="text-sm italic text-slate-400">No variables required for this prompt.</div>
                        )}
                    </div>

                    <div className="mt-8 pt-6 border-t border-slate-100">
                        <h4 className="text-sm font-medium mb-2 text-slate-700">Category Info</h4>
                        <p className="text-xs leading-relaxed mb-1 font-mono text-slate-400">ID: {activePrompt?.category}</p>
                        <p className="text-xs leading-relaxed text-slate-500">{activePrompt?.description}</p>
                        <p className="text-[10px] mt-4 text-slate-400">Last Updated: {activePrompt ? new Date(activePrompt.updatedAt).toLocaleString() : 'N/A'}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
