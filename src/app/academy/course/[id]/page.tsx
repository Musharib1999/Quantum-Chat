"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
    ChevronLeft, CheckCircle2, Lock, Play, 
    ArrowRight, ArrowLeft, Terminal, FileText, 
    Zap, AlertCircle, RefreshCcw, Trophy, ChevronRight
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import { useAuth } from '@/context/AuthContext';
import dynamic from 'next/dynamic';
import { generateCertificate } from '@/lib/certificate-generator';
import { Award } from 'lucide-react';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

export default function CourseViewer() {
    const { id: courseId } = useParams();
    const router = useRouter();
    const { isAuthenticated, user } = useAuth();
    
    const [course, setCourse] = useState<any>(null);
    const [sections, setSections] = useState<any[]>([]);
    const [activeSection, setActiveSection] = useState<any>(null);
    const [progress, setProgress] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    
    const [code, setCode] = useState('');
    const [isExecuting, setIsExecuting] = useState(false);
    const [executionOutput, setExecutionOutput] = useState<any>(null);
    const [attemptsLeft, setAttemptsLeft] = useState(3);

    useEffect(() => {
        if (!isAuthenticated) {
            router.push(`/login?redirect=/academy/course/${courseId}`);
            return;
        }
        fetchCourseData();
    }, [courseId, isAuthenticated]);

    const fetchCourseData = async () => {
        try {
            const [courseRes, sectionsRes, progressRes] = await Promise.all([
                axios.get(`/api/academy/courses/${courseId}`, {
                    headers: { 'x-api-key': user?.apiKey }
                }),
                axios.get(`/api/academy/courses/${courseId}/sections`, {
                    headers: { 'x-api-key': user?.apiKey }
                }), 
                axios.get(`/api/academy/progress/${courseId}`, {
                    headers: { 'x-api-key': user?.apiKey }
                })
            ]);
            
            setCourse(courseRes.data);
            const sortedSections = sectionsRes.data.sort((a: any, b: any) => a.order - b.order);
            setSections(sortedSections);
            setProgress(progressRes.data);
            
            // Set initial active section (first uncompleted or first section)
            const completedIds = progressRes.data?.completedSections || [];
            const nextSection = sortedSections.find((s: any) => !completedIds.includes(s._id)) || sortedSections[0];
            setActiveSection(nextSection);
            
            if (nextSection?.type === 'question') {
                setCode(nextSection.boilerplateCode || '');
            }
        } catch (err) {
            toast.error('Failed to load course');
        } finally {
            setLoading(false);
        }
    };

    const handleSectionChange = (section: any) => {
        // Prevent jumping ahead
        const sectionIndex = sections.findIndex(s => s._id === section._id);
        const completedIds = progress?.completedSections || [];
        
        for (let i = 0; i < sectionIndex; i++) {
            if (!completedIds.includes(sections[i]._id)) {
                toast.error('Complete previous sections first!', { icon: '🔒' });
                return;
            }
        }
        
        setActiveSection(section);
        if (section.type === 'question') {
            setCode(section.boilerplateCode || '');
        }
        setExecutionOutput(null);
    };

    const handleNext = () => {
        const currentIndex = sections.findIndex(s => s._id === activeSection._id);
        if (currentIndex < sections.length - 1) {
            handleSectionChange(sections[currentIndex + 1]);
        }
    };

    const handleMarkComplete = async () => {
        try {
            await axios.post(`/api/academy/progress/complete`, {
                courseId,
                sectionId: activeSection._id
            });
            toast.success('Section completed!');
            
            // Refresh progress
            const res = await axios.get(`/api/academy/progress/${courseId}`);
            setProgress(res.data);
            
            if (res.data.isCompleted) {
                toast.success('Congratulations! Course Completed!', { duration: 5000, icon: '🏆' });
            }
        } catch (err) {
            toast.error('Failed to save progress');
        }
    };

    const handleRunCode = async () => {
        if (isExecuting) return;
        setIsExecuting(true);
        setExecutionOutput(null);
        
        try {
            const res = await axios.post('/api/academy/validate', {
                courseId,
                sectionId: activeSection._id,
                code,
                provider: activeSection.provider
            });
            
            setExecutionOutput(res.data);
            
            if (res.data.success) {
                toast.success('Challenge Solved!', { icon: '🎯' });
                handleMarkComplete();
            } else {
                setAttemptsLeft(prev => Math.max(0, prev - 1));
                if (res.data.timeout) {
                    toast.error('Execution Timeout! Your code is too complex.', { icon: '⏳' });
                } else {
                    toast.error('Incorrect Output. Try again!');
                }
            }
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Execution failed');
        } finally {
            setIsExecuting(false);
        }
    };

    if (loading) return (
        <div className="h-screen bg-white flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-[rgb(27,176,206)] border-t-transparent rounded-full animate-spin" />
                <p className="text-slate-500 font-bold animate-pulse">Initializing Academy Lab...</p>
            </div>
        </div>
    );

    const completedIds = progress?.completedSections || [];
    const isActiveCompleted = completedIds.includes(activeSection?._id);

    return (
        <div className="h-screen bg-white flex overflow-hidden font-sans">
            {/* Sidebar */}
            <aside className="w-80 border-r border-slate-200 flex flex-col bg-slate-50/50">
                <div className="p-6 border-b border-slate-200 bg-white">
                    <button 
                        onClick={() => router.push('/academy')}
                        className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-all text-sm font-bold mb-4"
                    >
                        <ChevronLeft size={16} /> Back to Dashboard
                    </button>
                    <h1 className="text-lg font-black text-slate-900 leading-tight">{course?.title}</h1>
                    <div className="mt-4 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-emerald-500 transition-all duration-500"
                            style={{ width: `${(completedIds.length / sections.length) * 100}%` }}
                        />
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">
                        {completedIds.length} of {sections.length} sections complete
                    </p>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {sections.map((section, index) => {
                        const isLocked = index > 0 && !completedIds.includes(sections[index-1]._id) && !completedIds.includes(section._id);
                        const isCompleted = completedIds.includes(section._id);
                        const isActive = activeSection?._id === section._id;

                        return (
                            <button
                                key={section._id}
                                onClick={() => handleSectionChange(section)}
                                className={`w-full text-left p-4 rounded-2xl transition-all flex items-start gap-3 group relative ${
                                    isActive 
                                    ? 'bg-white shadow-md shadow-slate-200 border border-slate-200 ring-1 ring-slate-200' 
                                    : 'hover:bg-white/60 border border-transparent'
                                } ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <div className={`mt-0.5 shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                                    isCompleted ? 'bg-emerald-100 text-emerald-600' : 
                                    isActive ? 'bg-[rgb(27,176,206)] text-white' : 'bg-slate-200 text-slate-400 group-hover:bg-slate-300'
                                }`}>
                                    {isCompleted ? <CheckCircle2 size={12} /> : 
                                     isLocked ? <Lock size={10} /> : <span className="text-[10px] font-bold">{index + 1}</span>}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className={`text-sm font-bold truncate transition-colors ${
                                        isActive ? 'text-slate-900' : 'text-slate-500 group-hover:text-slate-700'
                                    }`}>
                                        {section.title}
                                    </h4>
                                    <div className="flex items-center gap-2 mt-1">
                                        {section.type === 'question' ? (
                                            <span className="flex items-center gap-1 text-[8px] uppercase font-black text-amber-500">
                                                <Terminal size={8} /> Lab Challenge
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 text-[8px] uppercase font-black text-blue-500">
                                                <FileText size={8} /> Lesson
                                            </span>
                                        )}
                                    </div>
                                </div>
                                {isActive && (
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                        <ChevronRight size={14} className="text-slate-300" />
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </aside>

            {/* Content Area */}
            <main className="flex-1 flex flex-col min-w-0 bg-white">
                <div className="flex-1 overflow-y-auto">
                    <div className="max-w-4xl mx-auto py-16 px-12">
                        <div className="mb-10">
                            <h2 className="text-4xl font-black text-slate-900 mb-2">{activeSection?.title}</h2>
                            <div className="h-1.5 w-20 bg-[rgb(27,176,206)] rounded-full" />
                        </div>
                        
                        <div className="bg-white rounded-3xl p-10 border border-slate-100 shadow-sm mb-12">
                            <MarkdownRenderer content={activeSection?.content || ''} />
                        </div>

                        {activeSection?.type === 'text' && (
                            <div className="flex justify-between items-center pt-8 border-t border-slate-100">
                                <div />
                                <button 
                                    onClick={isActiveCompleted ? handleNext : handleMarkComplete}
                                    className="bg-[rgb(27,176,206)] text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-2 hover:bg-[rgb(27,176,206)]/90 transition-all shadow-xl shadow-[rgb(27,176,206)]/20 active:scale-95"
                                >
                                    {isActiveCompleted ? 'Next Lesson' : 'Mark as Completed'} <ArrowRight size={20} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Lab Environment (Monaco) */}
                {activeSection?.type === 'question' && (
                    <div className="h-[500px] border-t-4 border-[rgb(27,176,206)] flex flex-col bg-[#1e1e1e] relative">
                        <div className="h-12 bg-slate-900 flex items-center justify-between px-6 shrink-0 border-b border-white/5">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <Terminal size={14} className="text-emerald-400" />
                                    <span className="text-[10px] font-black text-white uppercase tracking-widest">Quantum IDE</span>
                                </div>
                                <div className="h-4 w-px bg-slate-700" />
                                <span className="text-[10px] font-bold text-slate-400">Target: {activeSection.provider.toUpperCase()} Solver</span>
                            </div>
                            <div className="flex items-center gap-4">
                                {attemptsLeft < 3 && (
                                    <span className="text-[10px] font-bold text-amber-400 uppercase">
                                        Attempts Left: {attemptsLeft}
                                    </span>
                                )}
                                <button 
                                    onClick={handleRunCode}
                                    disabled={isExecuting || attemptsLeft === 0}
                                    className={`px-6 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all ${
                                        isExecuting 
                                        ? 'bg-slate-700 text-slate-500 cursor-not-allowed' 
                                        : 'bg-emerald-500 text-white hover:bg-emerald-400 shadow-lg shadow-emerald-500/20'
                                    }`}
                                >
                                    {isExecuting ? <RefreshCcw size={14} className="animate-spin" /> : <Play size={14} />}
                                    Execute Circuit
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 flex overflow-hidden">
                            <div className="flex-1 relative border-r border-slate-800">
                                <MonacoEditor
                                    height="100%"
                                    language="python"
                                    theme="vs-dark"
                                    value={code}
                                    onChange={(v) => setCode(v || '')}
                                    options={{
                                        fontSize: 14,
                                        fontFamily: 'JetBrains Mono, Menlo, monospace',
                                        minimap: { enabled: false },
                                        scrollBeyondLastLine: false,
                                        lineNumbers: 'on',
                                        renderLineHighlight: 'all',
                                        scrollbar: {
                                            vertical: 'hidden',
                                            horizontal: 'hidden'
                                        }
                                    }}
                                />
                            </div>
                            <div className="w-[400px] bg-[#0d0d0d] flex flex-col text-xs font-mono">
                                <div className="p-3 border-b border-white/5 bg-white/5 text-[9px] font-bold uppercase text-slate-500 tracking-widest">
                                    Execution Console
                                </div>
                                <div className="flex-1 p-6 overflow-y-auto text-emerald-400/90 leading-relaxed custom-scrollbar">
                                    {isExecuting ? (
                                        <div className="flex items-center gap-2 animate-pulse">
                                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                                            Initializing remote solver...
                                        </div>
                                    ) : executionOutput ? (
                                        <div className="space-y-4">
                                            <div className={`flex items-center gap-2 font-bold ${executionOutput.success ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                {executionOutput.success ? '✅ CHALLENGE PASSED' : '❌ VALIDATION FAILED'}
                                            </div>
                                            {executionOutput.output && (
                                                <div className="text-slate-300">
                                                    <p className="text-white/30 mb-2 font-bold">RAW OUTPUT:</p>
                                                    <pre className="bg-black/40 p-4 rounded-xl border border-white/5 overflow-x-auto">
                                                        {executionOutput.output}
                                                    </pre>
                                                </div>
                                            )}
                                            {executionOutput.error && (
                                                <div className="text-rose-400 bg-rose-400/10 p-4 rounded-xl border border-rose-400/20">
                                                    <p className="font-bold">ERROR:</p>
                                                    {executionOutput.error}
                                                </div>
                                            )}
                                            {executionOutput.success && (
                                                <div className="mt-8 pt-8 border-t border-white/10 animate-in slide-in-from-bottom-4">
                                                    <p className="text-emerald-300 font-bold flex items-center gap-2">
                                                        <Trophy size={16} /> Educator's Insight:
                                                    </p>
                                                    <p className="mt-2 text-slate-400 leading-relaxed italic">
                                                        {activeSection.explanation}
                                                    </p>
                                                    <button 
                                                        onClick={handleNext}
                                                        className="mt-6 w-full py-3 bg-white text-black rounded-xl font-bold hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                                                    >
                                                        Next Section <ArrowRight size={16} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-slate-600 italic">
                                            {/* Awaiting quantum execution... */} <br />
                                            {/* Click "Execute Circuit" to validate your solution. */}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
            {/* Course Completion Overlay */}
            {progress?.isCompleted && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/90 backdrop-blur-xl animate-in fade-in duration-700">
                    <div className="max-w-xl w-full bg-white rounded-[40px] p-12 text-center shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-500">
                        {/* Decorative Background Elements */}
                        <div className="absolute -top-24 -right-24 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl" />
                        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-[rgb(27,176,206)]/10 rounded-full blur-3xl" />

                        <div className="relative z-10">
                            <div className="w-24 h-24 bg-emerald-500 text-white rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-emerald-500/40 rotate-12">
                                <Trophy size={48} />
                            </div>
                            
                            <h2 className="text-4xl font-black text-slate-900 mb-4">Course Mastered!</h2>
                            <p className="text-slate-500 text-lg mb-10 leading-relaxed">
                                Exceptional work, <span className="font-bold text-slate-900">{user?.firstName || 'Quantum Pioneer'}</span>. 
                                You have successfully navigated the complexities of <span className="text-[rgb(27,176,206)] font-bold">{course?.title}</span>.
                            </p>

                            <div className="space-y-4">
                                <button 
                                    onClick={() => generateCertificate({
                                        userName: `${user?.firstName || 'Student'} ${user?.lastName || ''}`,
                                        courseName: course?.title || 'Quantum Course',
                                        date: new Date().toLocaleString()
                                    })}
                                    className="w-full py-5 bg-[rgb(27,176,206)] text-white rounded-2xl font-black text-lg hover:bg-[rgb(27,176,206)]/90 transition-all flex items-center justify-center gap-3 shadow-xl shadow-[rgb(27,176,206)]/20 active:scale-95"
                                >
                                    <Award size={24} /> Download Certificate
                                </button>
                                
                                <button 
                                    onClick={() => router.push('/academy')}
                                    className="w-full py-5 bg-slate-50 text-slate-600 rounded-2xl font-bold hover:bg-slate-100 transition-all flex items-center justify-center gap-2"
                                >
                                    <ArrowLeft size={20} /> Back to Dashboard
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
