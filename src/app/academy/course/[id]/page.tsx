"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
    ChevronLeft, CheckCircle2, Lock, Play, 
    ArrowRight, ArrowLeft, Terminal, FileText, 
    RefreshCcw, Trophy, ChevronRight, GraduationCap
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
    const { isAuthenticated, isInitializing, user } = useAuth();

    const [course, setCourse] = useState<any>(null);
    const [sections, setSections] = useState<any[]>([]);
    const [activeSection, setActiveSection] = useState<any>(null);
    const [progress, setProgress] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const [code, setCode] = useState('');
    const [isExecuting, setIsExecuting] = useState(false);
    const [executionOutput, setExecutionOutput] = useState<any>(null);
    const [attemptsLeft, setAttemptsLeft] = useState(3);

    // Resizable panel state (percentages, 3 panels)
    const [panelWidths, setPanelWidths] = useState([33.33, 33.33, 33.34]);
    const [isDragging, setIsDragging] = useState<number | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isInitializing) return;
        if (!isAuthenticated) {
            router.push(`/login?redirect=/academy/course/${courseId}`);
            return;
        }
        fetchCourseData();
    }, [courseId, isAuthenticated, isInitializing]);

    // Drag-to-resize logic
    const handleDividerMouseDown = (dividerIndex: number) => (e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(dividerIndex);
    };

    useEffect(() => {
        if (isDragging === null) return;

        const handleMouseMove = (e: MouseEvent) => {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const pct = (x / rect.width) * 100;

            setPanelWidths(prev => {
                const w = [...prev];
                const MIN = 15;
                if (isDragging === 0) {
                    const p1 = Math.max(MIN, Math.min(100 - MIN * 2, pct));
                    const remaining = 100 - p1;
                    const p2 = Math.max(MIN, Math.min(remaining - MIN, w[1]));
                    return [p1, p2, Math.max(MIN, remaining - p2)];
                } else {
                    const p1 = w[0];
                    const p2 = Math.max(MIN, Math.min(100 - p1 - MIN, pct - p1));
                    return [p1, p2, Math.max(MIN, 100 - p1 - p2)];
                }
            });
        };

        const handleMouseUp = () => setIsDragging(null);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    const fetchCourseData = async () => {
        try {
            const email = user?.email;
            const [courseRes, sectionsRes, progressRes] = await Promise.all([
                axios.get(`/api/academy/courses/${courseId}`),
                axios.get(`/api/academy/courses/${courseId}/sections?email=${encodeURIComponent(email || '')}`),
                axios.get(`/api/academy/progress/${courseId}?email=${encodeURIComponent(email || '')}`)
            ]);
            setCourse(courseRes.data);
            const sorted = sectionsRes.data.sort((a: any, b: any) => a.order - b.order);
            setSections(sorted);
            setProgress(progressRes.data);
            const completedIds = progressRes.data?.completedSections || [];
            const next = sorted.find((s: any) => !completedIds.includes(s._id)) || sorted[0];
            setActiveSection(next);
            if (next?.type === 'question') setCode(next.boilerplateCode || '');
        } catch {
            toast.error('Failed to load course');
        } finally {
            setLoading(false);
        }
    };

    const handleSectionChange = (section: any) => {
        const idx = sections.findIndex(s => s._id === section._id);
        const completedIds = progress?.completedSections || [];
        for (let i = 0; i < idx; i++) {
            if (!completedIds.includes(sections[i]._id)) {
                toast.error('Complete previous sections first!', { icon: '🔒' });
                return;
            }
        }
        setActiveSection(section);
        if (section.type === 'question') { setCode(section.boilerplateCode || ''); setAttemptsLeft(3); }
        setExecutionOutput(null);
    };

    const handleNext = () => {
        const idx = sections.findIndex(s => s._id === activeSection._id);
        if (idx < sections.length - 1) handleSectionChange(sections[idx + 1]);
    };

    const handleMarkComplete = async () => {
        try {
            await axios.post(`/api/academy/progress/complete`, {
                courseId, sectionId: activeSection._id, email: user?.email
            });
            toast.success('Section completed!');
            const res = await axios.get(`/api/academy/progress/${courseId}?email=${encodeURIComponent(user?.email || '')}`);
            setProgress(res.data);
            if (res.data.isCompleted) {
                toast.success('Course Completed! 🏆', { duration: 5000 });
            } else {
                const idx = sections.findIndex(s => s._id === activeSection._id);
                if (idx < sections.length - 1) {
                    const next = sections[idx + 1];
                    setActiveSection(next);
                    if (next.type === 'question') { setCode(next.boilerplateCode || ''); setAttemptsLeft(3); }
                    setExecutionOutput(null);
                }
            }
        } catch { toast.error('Failed to save progress'); }
    };

    const handleRunCode = async () => {
        if (isExecuting) return;
        setIsExecuting(true);
        setExecutionOutput(null);
        try {
            const res = await axios.post('/api/academy/validate', {
                courseId, sectionId: activeSection._id, code, provider: activeSection.provider
            });
            setExecutionOutput(res.data);
            if (res.data.success) {
                toast.success('Challenge Solved! 🎯');
                handleMarkComplete();
            } else {
                setAttemptsLeft(prev => Math.max(0, prev - 1));
                toast.error(res.data.timeout ? 'Execution Timeout!' : 'Incorrect Output. Try again!');
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

    // ─── COMPLETION OVERLAY (shared between both layouts) ───────────────────
    const CompletionOverlay = progress?.isCompleted ? (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/90 backdrop-blur-xl animate-in fade-in duration-700">
            <div className="max-w-xl w-full bg-white rounded-[40px] p-12 text-center shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-500">
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-[rgb(27,176,206)]/10 rounded-full blur-3xl" />
                <div className="relative z-10">
                    <div className="w-24 h-24 bg-emerald-500 text-white rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-emerald-500/40 rotate-12">
                        <Trophy size={48} />
                    </div>
                    <h2 className="text-4xl font-black text-slate-900 mb-4">Course Mastered!</h2>
                    <p className="text-slate-500 text-lg mb-10 leading-relaxed">
                        Exceptional work, <span className="font-bold text-slate-900">{user?.firstName || 'Quantum Pioneer'}</span>.{' '}
                        You have successfully navigated <span className="text-[rgb(27,176,206)] font-bold">{course?.title}</span>.
                    </p>
                    <div className="space-y-4">
                        <button onClick={() => generateCertificate({ userName: `${user?.firstName || 'Student'} ${user?.lastName || ''}`, courseName: course?.title || '', date: new Date().toLocaleString() })}
                            className="w-full py-5 bg-[#3066bb] text-white rounded-2xl font-black text-lg hover:bg-[#3066bb]/90 transition-all flex items-center justify-center gap-3 shadow-xl shadow-[#3066bb]/20">
                            <Award size={24} /> Download Certificate
                        </button>
                        <button onClick={() => router.push('/academy')}
                            className="w-full py-5 bg-slate-50 text-slate-600 rounded-2xl font-bold hover:bg-slate-100 transition-all flex items-center justify-center gap-2">
                            <ArrowLeft size={20} /> Back to Dashboard
                        </button>
                    </div>
                </div>
            </div>
        </div>
    ) : null;

    // ─── LAYOUT A: QUANTUM CHALLENGE — full-screen 3-panel IDE ──────────────
    if (activeSection?.type === 'question') {
        return (
            <div className="h-screen flex flex-col font-sans bg-[#0d0d0d] overflow-hidden" style={{ cursor: isDragging !== null ? 'col-resize' : 'default' }}>
                {/* Slim top bar */}
                <div className="h-11 shrink-0 bg-slate-900 border-b border-white/5 flex items-center justify-between px-5">
                    <button onClick={() => router.push('/academy')}
                        className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors text-xs font-bold">
                        <ChevronLeft size={14} /> Back
                    </button>
                    <div className="flex items-center gap-3">
                        <GraduationCap size={14} className="text-[rgb(27,176,206)]" />
                        <span className="text-white text-xs font-bold">{course?.title}</span>
                        <span className="text-slate-600 text-xs">·</span>
                        <span className="text-slate-400 text-xs">{activeSection?.title}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                            {completedIds.length}/{sections.length} done
                        </span>
                        {attemptsLeft < 3 && (
                            <span className="text-[10px] font-bold text-amber-400 uppercase">Attempts: {attemptsLeft}</span>
                        )}
                    </div>
                </div>

                {/* 3-Panel area */}
                <div ref={containerRef} className="flex-1 flex overflow-hidden min-h-0">

                    {/* Panel 1: Problem & Details */}
                    <div className="flex flex-col bg-white overflow-hidden" style={{ width: `${panelWidths[0]}%` }}>
                        <div className="h-8 shrink-0 bg-slate-50 border-b border-slate-200 flex items-center gap-2 px-4">
                            <FileText size={11} className="text-slate-400" />
                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Problem</span>
                        </div>
                        <div className="flex-1 overflow-y-auto p-8">
                            <h2 className="text-2xl font-black text-slate-900 mb-2">{activeSection.title}</h2>
                            <div className="h-1 w-12 bg-[rgb(27,176,206)] rounded-full mb-6" />
                            <div className="prose prose-sm max-w-none">
                                <MarkdownRenderer content={activeSection.content || ''} />
                            </div>
                        </div>
                    </div>

                    {/* Divider 1 */}
                    <div
                        onMouseDown={handleDividerMouseDown(0)}
                        className="w-1 shrink-0 bg-slate-800 hover:bg-[rgb(27,176,206)] transition-colors cursor-col-resize"
                    />

                    {/* Panel 2: Code Editor */}
                    <div className="flex flex-col overflow-hidden bg-[#1e1e1e]" style={{ width: `${panelWidths[1]}%` }}>
                        {/* Toolbar */}
                        <div className="h-11 shrink-0 bg-slate-900 flex items-center justify-between px-4 border-b border-white/5">
                            <div className="flex items-center gap-3">
                                <Terminal size={12} className="text-emerald-400" />
                                <span className="text-[10px] font-black text-white uppercase tracking-widest">Quantum IDE</span>
                                <div className="h-3 w-px bg-slate-700" />
                                <span className="text-[10px] text-slate-400">{activeSection.provider?.toUpperCase()} Solver</span>
                            </div>
                            <button
                                onClick={handleRunCode}
                                disabled={isExecuting || attemptsLeft === 0}
                                className={`px-5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all ${
                                    isExecuting ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-emerald-500 text-white hover:bg-emerald-400 shadow-lg shadow-emerald-500/20'
                                }`}
                            >
                                {isExecuting ? <RefreshCcw size={12} className="animate-spin" /> : <Play size={12} />}
                                Execute Circuit
                            </button>
                        </div>
                        {/* Monaco */}
                        <div className="flex-1 min-h-0">
                            <MonacoEditor
                                height="100%"
                                language="python"
                                theme="vs-dark"
                                value={code}
                                onChange={v => setCode(v || '')}
                                options={{
                                    fontSize: 13,
                                    fontFamily: 'JetBrains Mono, Menlo, monospace',
                                    minimap: { enabled: false },
                                    scrollBeyondLastLine: false,
                                    lineNumbers: 'on',
                                    renderLineHighlight: 'all',
                                    padding: { top: 12 }
                                }}
                            />
                        </div>
                    </div>

                    {/* Divider 2 */}
                    <div
                        onMouseDown={handleDividerMouseDown(1)}
                        className="w-1 shrink-0 bg-slate-800 hover:bg-[rgb(27,176,206)] transition-colors cursor-col-resize"
                    />

                    {/* Panel 3: Output Console */}
                    <div className="flex flex-col bg-[#0d0d0d] overflow-hidden" style={{ width: `${panelWidths[2]}%` }}>
                        <div className="h-8 shrink-0 bg-white/5 border-b border-white/5 flex items-center gap-2 px-4">
                            <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Execution Console</span>
                        </div>
                        <div className="flex-1 overflow-y-auto p-5 text-xs font-mono">
                            {isExecuting ? (
                                <div className="flex items-center gap-2 text-emerald-400 animate-pulse">
                                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                                    Initializing remote solver...
                                </div>
                            ) : executionOutput ? (
                                <div className="space-y-4">
                                    <div className={`font-bold text-sm ${executionOutput.success ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {executionOutput.success ? '✅ CHALLENGE PASSED' : '❌ VALIDATION FAILED'}
                                    </div>
                                    {executionOutput.output && (
                                        <div>
                                            <p className="text-white/30 mb-2 font-bold text-[10px] uppercase tracking-widest">Raw Output:</p>
                                            <pre className="bg-black/40 p-4 rounded-xl border border-white/5 overflow-x-auto text-slate-300 leading-relaxed whitespace-pre-wrap">
                                                {executionOutput.output}
                                            </pre>
                                        </div>
                                    )}
                                    {executionOutput.error && (
                                        <div className="text-rose-400 bg-rose-400/10 p-4 rounded-xl border border-rose-400/20">
                                            <p className="font-bold mb-1">Error:</p>
                                            {executionOutput.error}
                                        </div>
                                    )}
                                    {executionOutput.success && (
                                        <div className="mt-6 pt-6 border-t border-white/10">
                                            <p className="text-emerald-300 font-bold flex items-center gap-2 mb-2">
                                                <Trophy size={14} /> Educator's Insight:
                                            </p>
                                            <p className="text-slate-400 italic leading-relaxed">{activeSection.explanation}</p>
                                            <button onClick={handleNext}
                                                className="mt-5 w-full py-3 bg-white text-black rounded-xl font-bold hover:bg-slate-100 transition-all flex items-center justify-center gap-2">
                                                Next Section <ArrowRight size={14} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-slate-600 italic text-[11px] leading-loose">
                                    Run your code to see output here.<br />
                                    Click <span className="text-emerald-500 font-bold not-italic">Execute Circuit</span> in the editor toolbar.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {CompletionOverlay}
            </div>
        );
    }

    // ─── LAYOUT B: TEXT LESSON — sidebar + content ───────────────────────────
    return (
        <div className="h-screen bg-white flex overflow-hidden font-sans">
            {/* Sidebar */}
            <aside className="w-80 border-r border-slate-200 flex flex-col bg-slate-50/50 shrink-0">
                <div className="p-6 border-b border-slate-200 bg-white">
                    <button onClick={() => router.push('/academy')}
                        className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-all text-sm font-bold mb-4">
                        <ChevronLeft size={16} /> Back to Dashboard
                    </button>
                    <h1 className="text-lg font-black text-slate-900 leading-tight">{course?.title}</h1>
                    <div className="mt-4 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 transition-all duration-500"
                            style={{ width: `${(completedIds.length / sections.length) * 100}%` }} />
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">
                        {completedIds.length} of {sections.length} sections complete
                    </p>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {sections.map((section, index) => {
                        const isLocked = index > 0 && !completedIds.includes(sections[index - 1]._id) && !completedIds.includes(section._id);
                        const isCompleted = completedIds.includes(section._id);
                        const isActive = activeSection?._id === section._id;
                        return (
                            <button key={section._id} onClick={() => handleSectionChange(section)}
                                className={`w-full text-left p-4 rounded-2xl transition-all flex items-start gap-3 group relative ${
                                    isActive ? 'bg-white shadow-md border border-slate-200 ring-1 ring-slate-200' : 'hover:bg-white/60 border border-transparent'
                                } ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                <div className={`mt-0.5 shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                                    isCompleted ? 'bg-emerald-100 text-emerald-600' :
                                    isActive ? 'bg-[rgb(27,176,206)] text-white' : 'bg-slate-200 text-slate-400'
                                }`}>
                                    {isCompleted ? <CheckCircle2 size={12} /> : isLocked ? <Lock size={10} /> : <span className="text-[10px] font-bold">{index + 1}</span>}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className={`text-sm font-bold truncate ${isActive ? 'text-slate-900' : 'text-slate-500 group-hover:text-slate-700'}`}>
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
                                {isActive && <ChevronRight size={14} className="text-slate-300 absolute right-4 top-1/2 -translate-y-1/2" />}
                            </button>
                        );
                    })}
                </div>
            </aside>

            {/* Content Area */}
            <main className="flex-1 flex flex-col min-w-0 bg-white overflow-hidden">
                <div className="flex-1 min-h-0 overflow-y-auto">
                    <div className="max-w-4xl mx-auto py-16 px-12">
                        <div className="mb-10">
                            <h2 className="text-4xl font-black text-slate-900 mb-2">{activeSection?.title}</h2>
                            <div className="h-1.5 w-20 bg-[rgb(27,176,206)] rounded-full" />
                        </div>
                        <div className="bg-white rounded-3xl p-10 border border-slate-100 shadow-sm mb-12">
                            <MarkdownRenderer content={activeSection?.content || ''} />
                        </div>
                        <div className="flex justify-between items-center pt-8 border-t border-slate-100">
                            <div />
                            <button
                                onClick={isActiveCompleted ? handleNext : handleMarkComplete}
                                className="bg-[#3066bb] text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-2 hover:bg-[#3066bb]/90 transition-all shadow-xl shadow-[#3066bb]/20 active:scale-95">
                                {isActiveCompleted ? 'Next Lesson' : 'Mark as Completed'} <ArrowRight size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            </main>

            {CompletionOverlay}
        </div>
    );
}
