"use client";

import React, { useState, useEffect } from 'react';
import { getQaPairs, addQaPair, deleteQaPair, type QaPairType as QaPair } from '@/app/actions/admin';

export default function KnowledgeBaseManager() {
    const [qaPairs, setQaPairs] = useState<QaPair[]>([]);
    const [q, setQ] = useState("");
    const [a, setA] = useState("");
    const [type, setType] = useState<'text' | 'url' | 'form'>('text');
    const [formConfig, setFormConfig] = useState<string>('{\n "title": "Grievance Form",\n "fields": [\n  {"label": "Name", "type": "text"},\n  {"label": "Email", "type": "email"},\n  {"label": "Issue Type", "type": "select", "options": ["Water Supply", "Road Connection", "Street Light"]}\n ]\n}');
    const [editingId, setEditingId] = useState<string | null>(null);

    useEffect(() => {
        getQaPairs().then(setQaPairs);
    }, []);

    const resetForm = () => {
        setQ("");
        setA("");
        setType('text');
        setEditingId(null);
    };

    const handleSave = async () => {
        if (!q || !a) return;
        let config = null;
        if (type === 'form') {
            try {
                config = JSON.parse(formConfig);
            } catch (e) {
                alert("Invalid JSON in form config");
                return;
            }
        }
        
        if (editingId) {
            // Update logic (assuming addQaPair handles both or we filter and add)
            // For now, simple client side update and server side re-add
            const updatedPair: QaPair = {
                id: editingId,
                question: q,
                answer: a,
                type: type,
                formConfig: config,
                tags: []
            };
            await addQaPair(updatedPair);
            setQaPairs(qaPairs.map(p => p.id === editingId ? updatedPair : p));
        } else {
            const newPair: QaPair = {
                id: Date.now().toString(),
                question: q,
                answer: a,
                type: type,
                formConfig: config,
                tags: []
            };
            await addQaPair(newPair);
            setQaPairs([newPair, ...qaPairs]);
        }
        resetForm();
    };

    const handleEdit = (qa: QaPair) => {
        setQ(qa.question);
        setA(qa.answer);
        setType(qa.type);
        if (qa.formConfig) setFormConfig(JSON.stringify(qa.formConfig, null, 2));
        setEditingId(qa.id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDeleteQa = async (id: string) => {
        await deleteQaPair(id);
        setQaPairs(qaPairs.filter(p => p.id !== id));
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-[rgb(27,176,206)]/30 shadow-sm">
                <h3 className="font-semibold text-[#0F172A] mb-6 text-lg">
                    {editingId ? "Edit q&a pair" : "Add new q&a pair"}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                        className="p-3 bg-white border border-[rgb(27,176,206)]/30 rounded-xl focus:ring-1 focus:ring-[rgb(27,176,206)] outline-none text-[#0F172A] placeholder:text-[#0F172A] transition-all font-normal text-sm"
                        placeholder="User question"
                        value={q}
                        onChange={e => setQ(e.target.value)}
                    />
                    <div className="flex gap-2">
                        <select
                            className="p-3 bg-white border border-[rgb(27,176,206)]/30 rounded-xl outline-none text-[#0F172A] cursor-pointer text-sm"
                            value={type}
                            onChange={(e) => setType(e.target.value as 'text' | 'url' | 'form')}
                        >
                            <option value="text">Direct answer</option>
                            <option value="url">Url source</option>
                            <option value="form">Smart form</option>
                        </select>
                        <input
                            className="flex-1 p-3 bg-white border border-[rgb(27,176,206)]/30 rounded-xl focus:ring-1 focus:ring-[rgb(27,176,206)] outline-none text-[#0F172A] placeholder:text-[#0F172A] transition-all font-normal text-sm"
                            placeholder={type === 'text' ? "Assistant answer..." : type === 'url' ? "https://example.com/info-page" : "Help text for the form..."}
                            value={a}
                            onChange={e => setA(e.target.value)}
                        />
                    </div>
                </div>

                {type === 'form' && (
                    <div className="mt-4">
                        <label className="text-xs font-medium text-[#0F172A] mb-2 block">Form settings (JSON configuration)</label>
                        <textarea
                            className="w-full p-4 border border-[rgb(27,176,206)]/30 rounded-xl font-mono text-xs bg-white text-[#0F172A] h-40 outline-none focus:ring-1 focus:ring-[rgb(27,176,206)]"
                            value={formConfig}
                            onChange={e => setFormConfig(e.target.value)}
                        />
                    </div>
                )}
                <div className="mt-6 flex justify-end gap-3">
                    {editingId && (
                        <button
                            onClick={resetForm}
                            className="text-[#0F172A] hover:text-[#0F172A] px-6 py-2 rounded-xl font-semibold text-sm transition-all"
                        >
                            Cancel
                        </button>
                    )}
                    <button
                        onClick={handleSave}
                        className="bg-[rgb(48,102,187)] hover:bg-[#255299] text-white px-6 py-2 rounded-xl font-semibold text-sm transition-all shadow-sm"
                    >
                        {editingId ? "Update mapping" : "Save mapping"}
                    </button>
                </div>
            </div>

            <div className="space-y-4">
                <h4 className="font-semibold text-[#0F172A] text-xs tracking-wider">Existing mappings ({qaPairs.length})</h4>
                {qaPairs.map(qa => (
                    <div key={qa.id} className="bg-white p-5 rounded-2xl border border-[rgb(27,176,206)]/30 hover:border-slate-300 shadow-sm flex items-start justify-between group transition-all">
                        <div className="space-y-2 flex-1 pr-4">
                            <p className="font-semibold text-[#0F172A] text-base">
                                <span className="text-[#0F172A] font-normal text-sm mr-2">q:</span> {qa.question}
                            </p>
                            <div className="text-[#0F172A] leading-relaxed bg-white p-3 rounded-lg border border-[rgb(27,176,206)]/20 text-sm">
                                <span className="text-[#0F172A] font-bold text-xs mr-2">ai response:</span> {qa.answer}
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleEdit(qa)}
                                className="px-3 py-1.5 text-[#0F172A] hover:bg-white rounded-lg transition-colors font-semibold text-xs"
                            >
                                Edit
                            </button>
                            <button
                                onClick={() => handleDeleteQa(qa.id)}
                                className="px-3 py-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors font-semibold text-xs"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
