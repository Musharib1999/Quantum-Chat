"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, CheckCircle2, AlertCircle, Loader2, ChevronRight } from 'lucide-react';
import axios from 'axios';

interface Submission {
    _id: string;
    problem: string;
    industry: string;
    status: 'pending_approval' | 'live' | 'rejected';
    createdAt: string;
}

interface MySubmissionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    userEmail: string;
}

export default function MySubmissionsModal({ isOpen, onClose, userEmail }: MySubmissionsModalProps) {
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchSubmissions = async () => {
        try {
            const res = await axios.get(`/api/industry/my-submissions?email=${userEmail}`);
            setSubmissions(res.data);
        } catch (error) {
            console.error("Failed to fetch submissions", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen && userEmail) {
            fetchSubmissions();
        }
    }, [isOpen, userEmail]);

    if (!isOpen) return null;

    const getStatusUI = (status: string) => {
        switch (status) {
            case 'live':
                return { 
                    label: 'Approved', 
                    icon: <CheckCircle2 size={14} />, 
                    color: 'text-green-500 bg-green-500/10 border-green-500/20' 
                };
            case 'rejected':
                return { 
                    label: 'Rejected', 
                    icon: <AlertCircle size={14} />, 
                    color: 'text-red-500 bg-red-500/10 border-red-500/20' 
                };
            default:
                return { 
                    label: 'Pending', 
                    icon: <Clock size={14} />, 
                    color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' 
                };
        }
    };

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-300">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-card border border-border rounded-[32px] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
                {/* Header */}
                <div className="p-6 md:p-8 border-b border-border flex items-center justify-between bg-card/50">
                    <div className="space-y-1">
                        <h2 className="text-2xl font-bold text-foreground">My Submissions</h2>
                        <p className="text-sm text-muted-foreground">Track the status of your contributed experiments.</p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-secondary rounded-xl text-muted-foreground transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                            <span className="animate-spin mb-4 block">
                                <Loader2 size={32} />
                            </span>
                            <p className="font-medium">Loading your contributions...</p>
                        </div>
                    ) : submissions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center text-muted-foreground">
                                <AlertCircle size={32} />
                            </div>
                            <div className="space-y-1">
                                <p className="text-lg font-bold text-foreground">No Submissions Found</p>
                                <p className="text-sm text-muted-foreground max-w-xs">You haven't submitted any quantum experiments yet.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {submissions.map((sub) => {
                                const status = getStatusUI(sub.status);
                                return (
                                    <div 
                                        key={sub._id}
                                        className="p-5 bg-secondary/30 border border-border rounded-2xl flex items-center justify-between group hover:border-[#3066bb]/30 transition-all"
                                    >
                                        <div className="space-y-1.5 min-w-0">
                                            <h3 className="text-base font-bold text-foreground truncate">{sub.problem}</h3>
                                            <div className="flex items-center gap-3">
                                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{sub.industry}</span>
                                                <span className="w-1 h-1 bg-border rounded-full" />
                                                <span className="text-[10px] font-medium text-muted-foreground">{new Date(sub.createdAt).toLocaleDateString()}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <div className={`px-3 py-1 rounded-full flex items-center gap-1.5 border ${status.color}`}>
                                                {status.icon}
                                                <span className="text-[11px] font-bold uppercase tracking-wider">{status.label}</span>
                                            </div>
                                            <ChevronRight className="text-muted-foreground group-hover:text-[#3066bb] group-hover:translate-x-0.5 transition-all" size={18} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 md:p-8 border-t border-border bg-card/30 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-8 py-3 bg-secondary text-foreground font-bold rounded-xl hover:bg-secondary/80 transition-all"
                    >
                        Close
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
