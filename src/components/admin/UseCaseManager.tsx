"use client";

import React, { useState, useEffect } from 'react';
import { Plus, Trash, ExternalLink } from 'lucide-react';
import axios from 'axios';
import { useTheme } from '@/components/ThemeContext';

interface UseCase {
    _id: string;
    title: string;
    industry: string;
    description: string;
    url?: string;
}

const INDUSTRIES = ['Healthcare', 'Finance', 'Logistics', 'Energy', 'Cybersecurity', 'Materials Science', 'General'];

export default function UseCaseManager() {
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';

    const [useCases, setUseCases] = useState<UseCase[]>([]);
    const [loading, setLoading] = useState(true);
    const [title, setTitle] = useState('');
    const [industry, setIndustry] = useState(INDUSTRIES[0]);
    const [description, setDescription] = useState('');
    const [url, setUrl] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

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

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !description) return;

        setIsSubmitting(true);
        try {
            const res = await axios.post('/api/use-cases', { title, industry, description, url });
            setUseCases([res.data, ...useCases]);
            setTitle('');
            setDescription('');
            setUrl('');
        } catch (error) {
            console.error('Failed to add use case', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
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
                <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Quantum Use Cases</h2>
            </div>

            {/* Add Form */}
            <form onSubmit={handleAdd} className={`p-4 rounded-lg border space-y-4 ${isDarkMode ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                        type="text"
                        placeholder="Use Case Title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className={`border rounded px-3 py-2 text-sm focus:outline-none focus:border-[#3066bb] ${isDarkMode ? 'bg-slate-950 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                    />
                    <select
                        value={industry}
                        onChange={(e) => setIndustry(e.target.value)}
                        className={`border rounded px-3 py-2 text-sm focus:outline-none focus:border-[#3066bb] ${isDarkMode ? 'bg-slate-950 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                    >
                        {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                    </select>
                </div>
                <div className="grid grid-cols-1 gap-4">
                    <textarea
                        placeholder="Description (short summary of the use case)"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={2}
                        className={`border rounded px-3 py-2 text-sm focus:outline-none focus:border-[#3066bb] resize-none ${isDarkMode ? 'bg-slate-950 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                    />
                    <input
                        type="text"
                        placeholder="Source or Reference URL (Optional)"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        className={`border rounded px-3 py-2 text-sm focus:outline-none focus:border-[#3066bb] ${isDarkMode ? 'bg-slate-950 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                    />
                </div>
                <button
                    type="submit"
                    disabled={isSubmitting || !title || !description}
                    className="flex items-center gap-2 bg-[#3066bb] hover:bg-[#255299] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                    <Plus size={16} />
                    {isSubmitting ? 'Adding...' : 'Add Use Case'}
                </button>
            </form>

            {/* Use Case List */}
            <div className={`border rounded-lg overflow-hidden ${isDarkMode ? 'border-white/10 bg-slate-900/50' : 'border-slate-200 bg-white'}`}>
                {loading ? (
                    <div className="p-8 text-center text-sm text-slate-500 flex flex-col items-center">
                        <div className="w-6 h-6 border-2 border-[#3066bb] border-t-transparent rounded-full animate-spin mb-3"></div>
                        Loading use cases...
                    </div>
                ) : useCases.length === 0 ? (
                    <div className="p-8 text-center text-sm text-slate-500">
                        No use cases found. Add one above.
                    </div>
                ) : (
                    <div className="divide-y divide-white/10 dark:divide-white/5">
                        {useCases.map((useCase) => (
                            <div key={useCase._id} className="p-4 flex flex-col md:flex-row md:items-start justify-between gap-4 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className={`font-medium text-sm truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                            {useCase.title}
                                        </h4>
                                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-semibold tracking-wider ${isDarkMode ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                                            {useCase.industry}
                                        </span>
                                    </div>
                                    <p className={`text-sm mt-1 line-clamp-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                        {useCase.description}
                                    </p>
                                    {useCase.url && (
                                        <a href={useCase.url} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-1 mt-2 text-xs hover:underline ${isDarkMode ? 'text-blue-400' : 'text-[#3066bb]'}`}>
                                            Source Link <ExternalLink size={12} />
                                        </a>
                                    )}
                                </div>
                                <button
                                    onClick={() => handleDelete(useCase._id)}
                                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors shrink-0"
                                    title="Delete Use Case"
                                >
                                    <Trash size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
