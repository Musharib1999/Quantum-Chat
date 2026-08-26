"use client";

import React, { useState, useEffect } from 'react';
import { getCourses, addCourse, updateCourse, deleteCourse, type CourseType, type CourseModuleType, getExercises, addExercise, updateExercise, deleteExercise } from '@/app/actions/admin';
import { BookOpen, Plus, Trash2, Edit, ChevronDown, ChevronRight, Save, X, PlusCircle, MinusCircle } from 'lucide-react';

export default function AcademyManager() {
    const [courses, setCourses] = useState<CourseType[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedIds, setExpandedIds] = useState<string[]>([]);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Exercise manager states
    const [selectedCourseForExercises, setSelectedCourseForExercises] = useState<CourseType | null>(null);
    const [exercises, setExercises] = useState<any[]>([]);
    const [isExerciseFormOpen, setIsExerciseFormOpen] = useState(false);
    const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
    
    // Exercise Form State
    const [exerciseTitle, setExerciseTitle] = useState('');
    const [exerciseType, setExerciseType] = useState<'code' | 'circuit' | 'optimization'>('circuit');
    const [exerciseQubits, setExerciseQubits] = useState(2);
    const [exerciseBits, setExerciseBits] = useState(2);
    const [exerciseInstructions, setExerciseInstructions] = useState('');
    const [exerciseHintsRaw, setExerciseHintsRaw] = useState('');
    const [exerciseGatesRaw, setExerciseGatesRaw] = useState('');
    const [exerciseTargetState, setExerciseTargetState] = useState('');
    const [exerciseReferenceCode, setExerciseReferenceCode] = useState('');

    // Form State
    const [level, setLevel] = useState<number>(1);
    const [title, setTitle] = useState('');
    const [subtitle, setSubtitle] = useState('');
    const [outcome, setOutcome] = useState('');
    const [prompt, setPrompt] = useState('');
    const [order, setOrder] = useState<number>(0);
    
    // Complex fields as textarea lines
    const [handsOnRaw, setHandsOnRaw] = useState('');
    const [postsRaw, setPostsRaw] = useState('');
    
    // Modules editor state
    interface EditingModuleType {
        name: string;
        topicsRaw: string;
    }
    const [modules, setModules] = useState<EditingModuleType[]>([
        { name: 'Module 1: Getting Started', topicsRaw: 'Introduction' }
    ]);

    useEffect(() => {
        loadCourses();
    }, []);

    const loadCourses = async () => {
        setLoading(true);
        try {
            const data = await getCourses();
            setCourses(data);
        } catch (e) {
            console.error("Failed to load courses", e);
        } finally {
            setLoading(false);
        }
    };

    const toggleExpand = (id: string) => {
        setExpandedIds(prev => 
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const handleOpenAdd = () => {
        setEditingId(null);
        setLevel(courses.length + 1);
        setTitle('');
        setSubtitle('');
        setOutcome('');
        setPrompt('');
        setOrder(courses.length + 1);
        setHandsOnRaw('');
        setPostsRaw('');
        setModules([{ name: 'Module 1', topicsRaw: '' }]);
        setIsFormOpen(true);
    };

    const handleOpenEdit = (course: CourseType) => {
        setEditingId(course.id);
        setLevel(course.level);
        setTitle(course.title);
        setSubtitle(course.subtitle);
        setOutcome(course.outcome);
        setPrompt(course.prompt);
        setOrder(course.order);
        setHandsOnRaw((course.handsOn || []).join('\n'));
        setPostsRaw((course.posts || []).join('\n'));
        setModules(course.modules && course.modules.length > 0 ? course.modules.map(m => ({ name: m.name, topicsRaw: (m.topics || []).join('\n') })) : [{ name: 'Module 1', topicsRaw: '' }]);
        setIsFormOpen(true);
    };

    // Modules editing handlers
    const addModuleField = () => {
        setModules(prev => [...prev, { name: `Module ${prev.length + 1}`, topicsRaw: '' }]);
    };

    const removeModuleField = (index: number) => {
        setModules(prev => prev.filter((_, i) => i !== index));
    };

    const handleModuleChange = (index: number, name: string, topicsRaw: string) => {
        setModules(prev => prev.map((m, i) => i === index ? { name, topicsRaw } : m));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !subtitle || !outcome || !prompt) return;

        const handsOn = handsOnRaw.split('\n').map(x => x.trim()).filter(x => x.length > 0);
        const posts = postsRaw.split('\n').map(x => x.trim()).filter(x => x.length > 0);

        const parsedModules = modules.map(m => ({
            name: m.name,
            topics: m.topicsRaw.split('\n').map(t => t.trim()).filter(t => t.length > 0)
        }));

        const courseData = {
            level,
            title,
            subtitle,
            outcome,
            prompt,
            order,
            handsOn,
            posts,
            modules: parsedModules
        };

        try {
            if (editingId) {
                await updateCourse(editingId, courseData);
            } else {
                await addCourse(courseData);
            }
            setIsFormOpen(false);
            loadCourses();
        } catch (err) {
            console.error("Failed to save course", err);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this course?")) return;
        try {
            await deleteCourse(id);
            loadCourses();
        } catch (err) {
            console.error("Failed to delete course", err);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-[rgb(27,176,206)]/20 pb-4">
                <div>
                    <h3 className="font-extrabold text-lg text-slate-800 tracking-tight flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-blue-600" />
                        Academy Course Manager
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">Manage the Guided Learning syllabus levels, modules, exercises, and recommended reading posts.</p>
                </div>
                {!isFormOpen && (
                    <button
                        onClick={handleOpenAdd}
                        className="bg-[rgb(48,102,187)] hover:bg-[#255299] text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                        <Plus className="w-4 h-4" />
                        Add New Course
                    </button>
                )}
            </div>

            {isFormOpen && (
                <form onSubmit={handleSave} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <h4 className="font-extrabold text-sm text-slate-700">
                            {editingId ? 'Edit Course Details' : 'Configure New Academy Course'}
                        </h4>
                        <button type="button" onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-slate-600">
                            <X className="w-4.5 h-4.5" />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] text-slate-500 uppercase font-bold">Course Level</label>
                            <input 
                                type="number" 
                                required
                                value={level} 
                                onChange={e => setLevel(parseInt(e.target.value) || 1)}
                                className="w-full p-2.5 bg-white border border-slate-250 rounded-xl text-xs font-semibold"
                            />
                        </div>
                        <div className="space-y-1 md:col-span-2">
                            <label className="text-[10px] text-slate-500 uppercase font-bold">Course Title</label>
                            <input 
                                type="text" 
                                required
                                placeholder="e.g. Quantum Computing 101"
                                value={title} 
                                onChange={e => setTitle(e.target.value)}
                                className="w-full p-2.5 bg-white border border-slate-250 rounded-xl text-xs font-semibold"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1 md:col-span-2">
                            <label className="text-[10px] text-slate-500 uppercase font-bold">Subtitle / Description</label>
                            <input 
                                type="text" 
                                required
                                placeholder="e.g. Introduction to Qubits and Circuits"
                                value={subtitle} 
                                onChange={e => setSubtitle(e.target.value)}
                                className="w-full p-2.5 bg-white border border-slate-250 rounded-xl text-xs font-semibold"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] text-slate-500 uppercase font-bold">Display Order</label>
                            <input 
                                type="number" 
                                required
                                value={order} 
                                onChange={e => setOrder(parseInt(e.target.value) || 0)}
                                className="w-full p-2.5 bg-white border border-slate-250 rounded-xl text-xs font-semibold"
                            />
                        </div>
                    </div>

                    {/* Syllabus Modules Sub-Editor */}
                    <div className="space-y-3 border-t border-slate-200 pt-3">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] text-slate-500 uppercase font-bold">Syllabus Modules ({modules.length})</span>
                            <button 
                                type="button" 
                                onClick={addModuleField}
                                className="text-blue-600 hover:text-blue-700 text-xs font-bold flex items-center gap-1"
                            >
                                <PlusCircle className="w-4 h-4" /> Add Module
                            </button>
                        </div>
                        <div className="space-y-3">
                            {modules.map((mod, idx) => (
                                <div key={idx} className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2 relative">
                                    {modules.length > 1 && (
                                        <button 
                                            type="button"
                                            onClick={() => removeModuleField(idx)}
                                            className="absolute right-3.5 top-3.5 text-slate-400 hover:text-red-500"
                                        >
                                            <MinusCircle className="w-4 h-4" />
                                        </button>
                                    )}
                                    <div className="grid grid-cols-1 gap-2 pr-6">
                                        <input 
                                            type="text"
                                            placeholder={`Module ${idx + 1} Name`}
                                            required
                                            value={mod.name}
                                            onChange={e => handleModuleChange(idx, e.target.value, mod.topicsRaw)}
                                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                                        />
                                        <textarea
                                            placeholder="Enter subtopics (one per line)"
                                            value={mod.topicsRaw}
                                            onChange={e => handleModuleChange(idx, mod.name, e.target.value)}
                                            className="w-full p-2 border border-slate-250 rounded-lg text-xs font-medium h-20 resize-y font-mono"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-200 pt-3">
                        <div className="space-y-1">
                            <label className="text-[10px] text-slate-500 uppercase font-bold">Hands-on Exercises (one per line)</label>
                            <textarea 
                                placeholder="Build a Bell state&#10;Run circuits on a simulator"
                                value={handsOnRaw}
                                onChange={e => setHandsOnRaw(e.target.value)}
                                className="w-full p-2.5 bg-white border border-slate-250 rounded-xl text-xs font-medium h-24 font-mono"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] text-slate-500 uppercase font-bold">Recommended Posts / Readings (one per line)</label>
                            <textarea 
                                placeholder="What Is Quantum Computing?&#10;How Does a Quantum Computer Work?"
                                value={postsRaw}
                                onChange={e => setPostsRaw(e.target.value)}
                                className="w-full p-2.5 bg-white border border-slate-250 rounded-xl text-xs font-medium h-24 font-mono"
                            />
                        </div>
                    </div>

                    <div className="space-y-1 border-t border-slate-200 pt-3">
                        <label className="text-[10px] text-slate-500 uppercase font-bold">Learning Outcome Summary</label>
                        <input 
                            type="text" 
                            required
                            placeholder="e.g. Build and understand basic quantum circuits."
                            value={outcome} 
                            onChange={e => setOutcome(e.target.value)}
                            className="w-full p-2.5 bg-white border border-slate-250 rounded-xl text-xs font-semibold"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] text-slate-500 uppercase font-bold">AI Guru Teaching Prompt template</label>
                        <textarea 
                            required
                            placeholder="Prompt triggered when users click 'Ask Guru to teach me this'"
                            value={prompt} 
                            onChange={e => setPrompt(e.target.value)}
                            className="w-full p-2.5 bg-white border border-slate-250 rounded-xl text-xs font-medium h-20"
                        />
                    </div>

                    <div className="flex gap-2 justify-end pt-2">
                        <button 
                            type="submit" 
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
                        >
                            <Save className="w-4 h-4" /> Save Course
                        </button>
                        <button 
                            type="button" 
                            onClick={() => setIsFormOpen(false)}
                            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-250 px-5 py-2.5 rounded-xl text-xs font-bold cursor-pointer"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            )}

            {loading ? (
                <div className="text-center py-12">
                    <p className="text-sm text-slate-500 animate-pulse font-semibold">Loading courses database...</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {courses.map(course => {
                        const isExpanded = expandedIds.includes(course.id);
                        return (
                            <div key={course.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs hover:shadow-xs transition-shadow">
                                <div 
                                    onClick={() => toggleExpand(course.id)}
                                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 transition-colors select-none"
                                >
                                    <div className="flex items-center gap-3">
                                        {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                                        <div>
                                            <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                                                <span className="bg-blue-50 text-blue-600 border border-blue-100 text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full">
                                                    Level {course.level}
                                                </span>
                                                {course.title}
                                            </h4>
                                            <p className="text-xs text-slate-400 font-medium mt-0.5">{course.subtitle}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                        <button 
                                            onClick={() => handleOpenEdit(course)}
                                            className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-colors"
                                            title="Edit Course"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(course.id)}
                                            className="p-2 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600 transition-colors"
                                            title="Delete Course"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {isExpanded && (
                                    <div className="px-5 pb-5 pt-1 border-t border-slate-100 bg-slate-50/30 grid grid-cols-1 md:grid-cols-2 gap-5 text-xs animate-in slide-in-from-top-2 duration-150">
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Syllabus Modules</span>
                                                <div className="space-y-3">
                                                    {course.modules.map((m, idx) => (
                                                        <div key={idx} className="bg-white border border-slate-200 p-3 rounded-lg space-y-1 shadow-3xs">
                                                            <h5 className="font-bold text-slate-800 text-[11px]">{m.name}</h5>
                                                            <ul className="list-disc pl-4 text-[10.5px] text-slate-500 space-y-0.5 font-medium leading-relaxed">
                                                                {m.topics.map((t, tidx) => <li key={tidx}>{t}</li>)}
                                                            </ul>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] uppercase font-bold text-blue-500 tracking-wider">Hands-on Exercises</span>
                                                    <button 
                                                        onClick={async () => {
                                                            setSelectedCourseForExercises(course);
                                                            setIsExerciseFormOpen(false);
                                                            try {
                                                                const exs = await getExercises(course.id);
                                                                setExercises(exs);
                                                            } catch (err) {
                                                                console.error("Failed to load exercises", err);
                                                            }
                                                        }}
                                                        className="text-[10px] bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold px-2 py-0.5 rounded border border-blue-200 transition-colors"
                                                    >
                                                        Manage Exercises
                                                    </button>
                                                </div>
                                                {course.handsOn && course.handsOn.length > 0 ? (
                                                    <ul className="list-disc pl-4 text-[11px] text-blue-600/80 font-semibold space-y-0.5">
                                                        {course.handsOn.map((h, idx) => <li key={idx}>{h}</li>)}
                                                    </ul>
                                                ) : (
                                                    <p className="text-[10px] text-slate-400 italic">No exercises configured.</p>
                                                )}
                                            </div>

                                            {course.posts && course.posts.length > 0 && (
                                                <div className="space-y-1.5">
                                                    <span className="text-[10px] uppercase font-bold text-amber-500 tracking-wider">Recommended Reading Posts</span>
                                                    <ul className="list-disc pl-4 text-[11px] text-amber-700/85 font-semibold space-y-0.5">
                                                        {course.posts.map((p, idx) => <li key={idx}>📖 {p}</li>)}
                                                    </ul>
                                                </div>
                                            )}

                                            <div className="space-y-1.5">
                                                <span className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider">Learning Outcome</span>
                                                <p className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 text-emerald-800 text-[11px] font-semibold leading-relaxed">
                                                    {course.outcome}
                                                </p>
                                            </div>

                                            <div className="space-y-1.5">
                                                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Teaching Template Prompt</span>
                                                <p className="bg-white border border-slate-200 p-2.5 rounded-lg text-slate-500 text-[10.5px] font-medium leading-relaxed font-mono">
                                                    {course.prompt}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {courses.length === 0 && (
                        <div className="text-center p-8 bg-slate-50 rounded-xl border border-dashed border-slate-350">
                            <p className="text-sm text-slate-500">No academy courses exist in the system yet.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Exercise Manager Modal Overlay */}
            {selectedCourseForExercises && (
                <div className="fixed inset-0 bg-slate-955/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200 text-left">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
                        {/* Header */}
                        <div className="p-5 border-b border-slate-150 flex items-center justify-between shrink-0 bg-slate-50">
                            <div>
                                <span className="text-[10px] uppercase tracking-wider bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded-full font-extrabold">
                                    Exercise Manager
                                </span>
                                <h3 className="font-extrabold text-base text-slate-800 mt-1.5 leading-snug">
                                    Level {selectedCourseForExercises.level}: {selectedCourseForExercises.title}
                                </h3>
                            </div>
                            <button 
                                onClick={() => setSelectedCourseForExercises(null)}
                                className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-200/50 rounded-lg transition-colors cursor-pointer"
                            >
                                <X className="w-4.5 h-4.5" />
                            </button>
                        </div>

                        {/* List & Form Content */}
                        <div className="p-6 overflow-y-auto space-y-5 flex-1">
                            {isExerciseFormOpen ? (
                                <form onSubmit={async (e) => {
                                    e.preventDefault();
                                    const payload = {
                                        courseId: selectedCourseForExercises.id,
                                        title: exerciseTitle,
                                        type: exerciseType,
                                        qubits: exerciseQubits,
                                        bits: exerciseBits,
                                        instructions: exerciseInstructions,
                                        hints: exerciseHintsRaw.split('\n').map(h => h.trim()).filter(h => h.length > 0),
                                        expectedGates: exerciseGatesRaw.split('\n').map(g => g.trim()).filter(g => g.length > 0),
                                        targetState: exerciseTargetState,
                                        referenceCode: exerciseReferenceCode
                                    };

                                    try {
                                        if (editingExerciseId) {
                                            await updateExercise(editingExerciseId, payload);
                                        } else {
                                            await addExercise(payload);
                                        }
                                        setIsExerciseFormOpen(false);
                                        setEditingExerciseId(null);
                                        const exs = await getExercises(selectedCourseForExercises.id);
                                        setExercises(exs);
                                    } catch (err) {
                                        console.error("Failed to save exercise", err);
                                    }
                                }} className="space-y-4">
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                        <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider">
                                            {editingExerciseId ? 'Edit Exercise' : 'Configure New Exercise'}
                                        </h4>
                                        <button 
                                            type="button" 
                                            onClick={() => setIsExerciseFormOpen(false)}
                                            className="text-slate-400 hover:text-slate-600"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1 flex flex-col">
                                            <label className="text-[10px] text-slate-500 uppercase font-bold">Title</label>
                                            <input 
                                                type="text" required
                                                value={exerciseTitle} onChange={e => setExerciseTitle(e.target.value)}
                                                className="p-2.5 bg-white border border-slate-250 rounded-xl text-xs font-semibold"
                                            />
                                        </div>
                                        <div className="space-y-1 flex flex-col">
                                            <label className="text-[10px] text-slate-500 uppercase font-bold">Type</label>
                                            <select 
                                                value={exerciseType} onChange={e => setExerciseType(e.target.value as any)}
                                                className="p-2.5 bg-white border border-slate-250 rounded-xl text-xs font-semibold"
                                            >
                                                <option value="circuit">Gate-Based Circuit Problem</option>
                                                <option value="code">Qiskit Code Sandbox</option>
                                                <option value="optimization">Optimization Problem</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1 flex flex-col">
                                            <label className="text-[10px] text-slate-500 uppercase font-bold">Qubits count</label>
                                            <input 
                                                type="number" required
                                                value={exerciseQubits} onChange={e => setExerciseQubits(parseInt(e.target.value) || 2)}
                                                className="p-2.5 bg-white border border-slate-250 rounded-xl text-xs font-semibold"
                                            />
                                        </div>
                                        <div className="space-y-1 flex flex-col">
                                            <label className="text-[10px] text-slate-500 uppercase font-bold">Classical Bits count</label>
                                            <input 
                                                type="number" required
                                                value={exerciseBits} onChange={e => setExerciseBits(parseInt(e.target.value) || 2)}
                                                className="p-2.5 bg-white border border-slate-250 rounded-xl text-xs font-semibold"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1 flex flex-col">
                                        <label className="text-[10px] text-slate-500 uppercase font-bold">Instructions</label>
                                        <textarea 
                                            required rows={3}
                                            value={exerciseInstructions} onChange={e => setExerciseInstructions(e.target.value)}
                                            className="p-2.5 bg-white border border-slate-250 rounded-xl text-xs font-medium"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1 flex flex-col">
                                            <label className="text-[10px] text-slate-500 uppercase font-bold">Hints (one per line)</label>
                                            <textarea 
                                                rows={3}
                                                value={exerciseHintsRaw} onChange={e => setExerciseHintsRaw(e.target.value)}
                                                className="p-2.5 bg-white border border-slate-250 rounded-xl text-xs font-medium"
                                            />
                                        </div>
                                        <div className="space-y-1 flex flex-col">
                                            <label className="text-[10px] text-slate-500 uppercase font-bold">Expected Gates (one per line)</label>
                                            <textarea 
                                                rows={3}
                                                value={exerciseGatesRaw} onChange={e => setExerciseGatesRaw(e.target.value)}
                                                className="p-2.5 bg-white border border-slate-250 rounded-xl text-xs font-medium"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1 flex flex-col">
                                            <label className="text-[10px] text-slate-500 uppercase font-bold">Target State (e.g. bell, superposition)</label>
                                            <input 
                                                type="text"
                                                value={exerciseTargetState} onChange={e => setExerciseTargetState(e.target.value)}
                                                className="p-2.5 bg-white border border-slate-250 rounded-xl text-xs font-semibold"
                                            />
                                        </div>
                                        <div className="space-y-1 flex flex-col">
                                            <label className="text-[10px] text-slate-500 uppercase font-bold">Reference / Starter Code</label>
                                            <textarea 
                                                rows={2}
                                                value={exerciseReferenceCode} onChange={e => setExerciseReferenceCode(e.target.value)}
                                                className="p-2.5 bg-white border border-slate-250 rounded-xl text-xs font-medium font-mono"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
                                        <button 
                                            type="submit"
                                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs cursor-pointer transition-colors shadow-sm"
                                        >
                                            Save Exercise
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={() => setIsExerciseFormOpen(false)}
                                            className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                        <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider">Course Exercises ({exercises.length})</h4>
                                        <button 
                                            onClick={() => {
                                                setExerciseTitle('');
                                                setExerciseType('circuit');
                                                setExerciseQubits(2);
                                                setExerciseBits(2);
                                                setExerciseInstructions('');
                                                setExerciseHintsRaw('');
                                                setExerciseGatesRaw('');
                                                setExerciseTargetState('');
                                                setExerciseReferenceCode('');
                                                setEditingExerciseId(null);
                                                setIsExerciseFormOpen(true);
                                            }}
                                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 cursor-pointer transition-all shadow-sm"
                                        >
                                            <Plus className="w-3.5 h-3.5" /> Add Exercise
                                        </button>
                                    </div>

                                    <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                                        {exercises.map((ex) => (
                                            <div key={ex.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between shadow-2xs hover:shadow-xs transition-shadow">
                                                <div>
                                                    <h5 className="font-bold text-slate-800 text-xs flex items-center gap-2">
                                                        {ex.title}
                                                        <span className="text-[9px] uppercase font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                                                            {ex.type}
                                                        </span>
                                                    </h5>
                                                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{ex.instructions}</p>
                                                    <p className="text-[10px] text-slate-400 mt-1.5 font-medium">
                                                        Qubits: {ex.qubits} · Bits: {ex.bits} {ex.expectedGates && ex.expectedGates.length > 0 && `· Gates: [${ex.expectedGates.join(', ')}]`} {ex.targetState && `· Target: ${ex.targetState}`}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button 
                                                        onClick={() => {
                                                            setEditingExerciseId(ex.id);
                                                            setExerciseTitle(ex.title);
                                                            setExerciseType(ex.type);
                                                            setExerciseQubits(ex.qubits);
                                                            setExerciseBits(ex.bits);
                                                            setExerciseInstructions(ex.instructions);
                                                            setExerciseHintsRaw((ex.hints || []).join('\n'));
                                                            setExerciseGatesRaw((ex.expectedGates || []).join('\n'));
                                                            setExerciseTargetState(ex.targetState || '');
                                                            setExerciseReferenceCode(ex.referenceCode || '');
                                                            setIsExerciseFormOpen(true);
                                                        }}
                                                        className="p-2 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors"
                                                        title="Edit Exercise"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                    <button 
                                                        onClick={async () => {
                                                            if (!confirm("Are you sure you want to delete this exercise?")) return;
                                                            try {
                                                                await deleteExercise(ex.id);
                                                                const exs = await getExercises(selectedCourseForExercises.id);
                                                                setExercises(exs);
                                                            } catch (err) {
                                                                console.error("Failed to delete exercise", err);
                                                            }
                                                        }}
                                                        className="p-2 hover:bg-red-50 rounded-lg text-red-500 transition-colors"
                                                        title="Delete Exercise"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}

                                        {exercises.length === 0 && (
                                            <p className="text-xs text-slate-400 italic text-center py-8">No custom exercises configured for this course yet.</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-2 shrink-0 justify-end">
                            <button
                                onClick={() => setSelectedCourseForExercises(null)}
                                className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-3xs"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
