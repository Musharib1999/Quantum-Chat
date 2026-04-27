"use client";

import React, { useState, useEffect } from 'react';
import { getGuardrails, addGuardrail, toggleGuardrail as toggleGuardrailAction, deleteGuardrail as deleteGuardrailAction, updateGuardrail as updateGuardrailAction, type GuardrailType as Guardrail } from '@/app/actions/admin';

export default function GuardrailManager() {
    const [guardrails, setGuardrails] = useState<Guardrail[]>([]);
    const [newRule, setNewRule] = useState("");
    const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
    const [editingRuleText, setEditingRuleText] = useState("");

    useEffect(() => {
        getGuardrails().then(setGuardrails);
    }, []);

    const handleAddRule = async () => {
        if (!newRule) return;
        const rule: Guardrail = {
            id: Date.now().toString(),
            rule: newRule,
            type: 'banned_topic',
            active: true
        };
        await addGuardrail(rule);
        setGuardrails([...guardrails, rule]);
        setNewRule("");
    };

    const handleToggleGuardrail = async (id: string) => {
        await toggleGuardrailAction(id);
        setGuardrails(guardrails.map(g => g.id === id ? { ...g, active: !g.active } : g));
    };

    const handleDeleteRule = async (id: string) => {
        if (!confirm("Are you sure you want to delete this guardrail?")) return;
        await deleteGuardrailAction(id);
        setGuardrails(guardrails.filter(g => g.id !== id));
    };

    const handleUpdateRule = async (id: string) => {
        if (!editingRuleText.trim()) return;
        await updateGuardrailAction(id, editingRuleText);
        setGuardrails(guardrails.map(g => g.id === id ? { ...g, rule: editingRuleText } : g));
        setEditingRuleId(null);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-[rgb(27,176,206)]/30 mb-8 shadow-sm">
                <h3 className="font-semibold text-[#0F172A] text-lg mb-2">Safety & compliance</h3>
                <p className="text-[#0F172A] text-sm">Define strict boundaries for the ai. These rules override all other knowledge retrieval.</p>
            </div>

            <div className="flex gap-4 mb-6">
                <input
                    className="flex-1 p-4 bg-[rgb(48,102,187)]/5 border border-[rgb(27,176,206)]/30 rounded-xl shadow-sm outline-none focus:ring-1 focus:ring-[rgb(27,176,206)] text-[#0F172A] placeholder:text-[#0F172A] text-sm"
                    placeholder="Enter a new guardrail rule (e.g., 'Do not discuss politics')"
                    value={newRule}
                    onChange={e => setNewRule(e.target.value)}
                />
                <button
                    onClick={handleAddRule}
                    className="bg-[rgb(48,102,187)] hover:bg-[#255299] text-white px-6 rounded-xl font-semibold transition-all shadow-sm text-sm"
                >
                    Add rule
                </button>
            </div>

            <div className="grid gap-4">
                {guardrails.map(g => (
                    <div key={g.id} className={`p-4 rounded-xl border flex items-center justify-between transition-all ${g.active ? 'bg-white border-[rgb(27,176,206)]/30 shadow-sm' : 'bg-[rgb(48,102,187)]/5 border-[rgb(27,176,206)]/20 opacity-60'}`}>
                        <div className="flex items-center gap-4 flex-1">
                            <div className="flex-1">
                                {editingRuleId === g.id ? (
                                    <div className="flex gap-2">
                                        <input
                                            className="flex-1 p-2 bg-white border border-[rgb(27,176,206)]/30 rounded-lg text-[#0F172A] text-sm"
                                            value={editingRuleText}
                                            onChange={e => setEditingRuleText(e.target.value)}
                                            autoFocus
                                        />
                                        <button onClick={() => handleUpdateRule(g.id)} className="px-3 py-1 text-[#0F172A] hover:bg-[rgb(48,102,187)]/10 rounded-lg text-xs font-semibold">
                                            Save
                                        </button>
                                        <button onClick={() => setEditingRuleId(null)} className="px-3 py-1 text-[#0F172A] hover:bg-[rgb(48,102,187)]/10 rounded-lg text-xs font-semibold">
                                            Cancel
                                        </button>
                                    </div>
                                ) : (
                                    <p className={`font-medium text-sm ${g.active ? 'text-[#0F172A]' : 'text-[#0F172A] line-through'}`}>{g.rule}</p>
                                )}
                                <span className="text-[10px] text-[#0F172A] font-medium tracking-wider">{g.type?.replace('_', ' ') || 'general'}</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {editingRuleId !== g.id && (
                                <button
                                    onClick={() => {
                                        setEditingRuleId(g.id);
                                        setEditingRuleText(g.rule);
                                    }}
                                    className="px-3 py-1.5 text-[#0F172A] hover:bg-[rgb(48,102,187)]/10 rounded-lg transition-colors font-semibold text-xs"
                                >
                                    Edit
                                </button>
                            )}
                            <button
                                onClick={() => handleDeleteRule(g.id)}
                                className="px-3 py-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors font-semibold text-xs"
                            >
                                Delete
                            </button>
                            <button
                                onClick={() => handleToggleGuardrail(g.id)}
                                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${g.active
                                    ? 'bg-green-50 text-green-600 hover:bg-green-100 border border-green-200'
                                    : 'bg-[rgb(48,102,187)]/10 text-[#0F172A] hover:bg-slate-200 border border-transparent'
                                    }`}
                            >
                                {g.active ? 'Active' : 'Disabled'}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
