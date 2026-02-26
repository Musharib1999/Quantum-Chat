"use client";

import React, { useState, useEffect } from 'react';
import { Briefcase, Loader2, ExternalLink, Info } from 'lucide-react';
import axios from 'axios';

interface UseCase {
    _id: string;
    title: string;
    industry: string;
    description: string;
    url?: string;
}

export default function UseCaseSidebar() {
    const [useCases, setUseCases] = useState<UseCase[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axios.get('/api/use-cases')
            .then(res => setUseCases(res.data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="flex flex-col h-full bg-card/30">
            <div className="p-6 border-b border-border">
                <h3 className="text-foreground mb-4 flex items-center gap-2">
                    <Briefcase className="text-purple-500 dark:text-purple-400" size={18} /> Quantum Use Cases
                </h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-border">
                {loading ? (
                    Array(4).fill(0).map((_, i) => (
                        <div key={i} className="p-4 bg-transparent border border-transparent rounded-xl flex flex-col gap-3">
                            <div className="flex justify-between items-start mb-1">
                                <div className="h-3 w-16 bg-muted rounded animate-pulse"></div>
                            </div>
                            <div className="h-4 w-5/6 bg-muted rounded animate-pulse"></div>
                            <div className="h-4 w-4/6 bg-muted rounded animate-pulse"></div>
                        </div>
                    ))
                ) : useCases.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground gap-3">
                        <Info size={24} className="opacity-50" />
                        <p className="text-sm">No use cases available at the moment.</p>
                    </div>
                ) : (
                    useCases.map((item) => (
                        <div
                            key={item._id}
                            className="p-4 bg-transparent border-transparent text-muted-foreground hover:bg-card hover:border-ring hover:ring-1 hover:ring-ring hover:text-foreground hover:shadow-md transition-all duration-200 rounded-xl group relative overflow-hidden flex flex-col gap-2 cursor-default"
                        >
                            <div className="flex justify-between items-start mb-1">
                                <span className="text-[10px] tracking-wider text-muted-foreground font-mono uppercase bg-secondary/50 px-1.5 py-0.5 rounded">
                                    {item.industry}
                                </span>
                            </div>
                            <h4 className="text-sm font-medium leading-normal text-foreground transition-colors">
                                {item.title}
                            </h4>
                            <p className="text-xs mt-1 line-clamp-4 leading-relaxed opacity-80 group-hover:opacity-100 transition-opacity">
                                {item.description}
                            </p>

                            {item.url && (
                                <div className="mt-2 flex items-center justify-start text-[10px] text-muted-foreground border-t border-border/30 pt-3">
                                    <a
                                        href={item.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 text-blue-500 hover:text-blue-400 font-medium transition-colors"
                                    >
                                        <ExternalLink size={12} /> Reference Link
                                    </a>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
