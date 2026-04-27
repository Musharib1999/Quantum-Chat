"use client";

import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface UseCase {
    _id: string;
    title: string;
    industry: string;
    description: string;
    url?: string;
}

const INDUSTRIES = ['Healthcare', 'Finance', 'Logistics', 'Energy', 'Cybersecurity', 'Materials Science', 'General'];

export default function UseCaseManager() {
    const [useCases, setUseCases] = useState<UseCase[]>([]);
    const [loading, setLoading] = useState(true);
    const [title, setTitle] = useState('');
    const [industry, setIndustry] = useState(INDUSTRIES[0]);
    const [description, setDescription] = useState('');
    const [url, setUrl] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    useEffect(() => {
        fetchUseCases();
    }, []);

    const fetchUseCases = async () => {
        try {
            const res = await axios.get('/api/use-cases');
            setUseCases(res.data);
        } catch (error) {
            console.error('Failed to fetch use cases', error);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setTitle('');
        setIndustry(INDUSTRIES[0]);
        setDescription('');
        setUrl('');
        setEditingId(null);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !description) return;

        setIsSubmitting(true);
        try {
            if (editingId) {
                const res = await axios.put(`/api/use-cases?id=${editingId}`, { title, industry, description, url });
                setUseCases(useCases.map(u => u._id === editingId ? res.data : u));
            } else {
                const res = await axios.post('/api/use-cases', { title, industry, description, url });
                setUseCases([res.data, ...useCases]);
            }
            resetForm();
        } catch (error) {
            console.error('Failed to save use case', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = (useCase: UseCase) => {
        setTitle(useCase.title);
        setIndustry(useCase.industry);
        setDescription(useCase.description);
        setUrl(useCase.url || '');
        setEditingId(useCase._id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this use case?")) return;
        try {
            await axios.delete(`/api/use-cases?id=${id}`);
            setUseCases(useCases.filter(u => u._id !== id));
        } catch (error) {
            console.error('Failed to delete use case', error);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-[#0F172A]">Quantum use cases</h2>
            </div>

            {/* Add/Edit Form */}
            <form onSubmit={handleSave} className="p-6 rounded-2xl border border-[rgb(27,176,206)]/30 bg-white space-y-4 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                        type="text"
                        placeholder="Use case title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="border border-[rgb(27,176,206)]/30 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-[rgb(27,176,206)] bg-[rgb(48,102,187)]/5 text-[#0F172A]"
                    />
                    <select
                        value={industry}
                        onChange={(e) => setIndustry(e.target.value)}
                        className="border border-[rgb(27,176,206)]/30 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-[rgb(27,176,206)] bg-[rgb(48,102,187)]/5 text-[#0F172A]"
                    >
                        {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                    </select>
                </div>
                <div className="space-y-4">
                    <textarea
                        placeholder="Description (short summary of the use case)"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={3}
                        className="w-full border border-[rgb(27,176,206)]/30 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-[rgb(27,176,206)] resize-none bg-[rgb(48,102,187)]/5 text-[#0F172A]"
                    />
                    <input
                        type="text"
                        placeholder="Source or reference url (optional)"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        className="w-full border border-[rgb(27,176,206)]/30 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-[rgb(27,176,206)] bg-[rgb(48,102,187)]/5 text-[#0F172A]"
                    />
                </div>
                <div className="flex gap-2 pt-2">
                    <button
                        type="submit"
                        disabled={isSubmitting || !title || !description}
                        className="bg-[rgb(48,102,187)] hover:bg-[#255299] text-white px-8 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 shadow-sm"
                    >
                        {isSubmitting ? 'Saving...' : editingId ? 'Update use case' : 'Add use case'}
                    </button>
                    {editingId && (
                        <button
                            type="button"
                            onClick={resetForm}
                            className="px-6 py-2.5 text-[#0F172A] hover:text-[#0F172A] text-sm font-semibold transition-all"
                        >
                            Cancel
                        </button>
                    )}
                </div>
            </form>

            {/* Use Case List */}
            <div className="border border-[rgb(27,176,206)]/30 rounded-xl overflow-hidden bg-white shadow-sm">
                {loading ? (
                    <div className="p-12 text-center text-sm text-[#0F172A]">Loading use cases...</div>
                ) : useCases.length === 0 ? (
                    <div className="p-12 text-center text-sm text-[#0F172A]">No use cases found. add one above.</div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {useCases.map((useCase) => (
                            <div key={useCase._id} className="p-5 flex flex-col md:flex-row md:items-start justify-between gap-4 hover:bg-[rgb(48,102,187)]/5 transition-colors group">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-1.5">
                                        <h4 className="font-semibold text-[#0F172A]">
                                            {useCase.title}
                                        </h4>
                                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[rgb(48,102,187)]/5 text-[#0F172A]">
                                            {useCase.industry}
                                        </span>
                                    </div>
                                    <p className="text-sm text-[#0F172A] leading-relaxed">
                                        {useCase.description}
                                    </p>
                                    {useCase.url && (
                                        <a href={useCase.url} target="_blank" rel="noopener noreferrer" className="inline-block mt-2.5 text-xs text-[#0F172A] hover:underline">
                                            View source
                                        </a>
                                    )}
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                    <button
                                        onClick={() => handleEdit(useCase)}
                                        className="text-[#0F172A] hover:text-[#0F172A] font-semibold text-xs transition-colors"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete(useCase._id)}
                                        className="text-red-500 hover:text-red-600 font-semibold text-xs transition-colors"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
