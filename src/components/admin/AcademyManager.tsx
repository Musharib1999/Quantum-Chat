"use client";

import React, { useState, useEffect } from 'react';
import { 
    Plus, Search, Edit2, Trash2, BookOpen, Layers, 
    CheckCircle2, Clock, ShieldCheck, ChevronRight,
    GraduationCap, Code, FileText, Save, X, AlertTriangle, ArrowLeft
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

interface Course {
    _id: string;
    title: string;
    description: string;
    category: string;
    difficulty: string;
    points: number;
    isPublished: boolean;
}

interface Section {
    _id: string;
    courseId: string;
    title: string;
    type: 'text' | 'question';
    content: string;
    order: number;
    provider: 'qiskit' | 'dwave' | 'ortools';
    boilerplateCode: string;
    targetAnswer: string;
    explanation: string;
}

export default function AcademyManager() {
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeSubTab, setActiveSubTab] = useState('courses'); // 'courses', 'approvals'
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCourse, setEditingCourse] = useState<Course | null>(null);
    const [courseForm, setCourseForm] = useState({
        title: '',
        description: '',
        category: 'Quantum Computing',
        difficulty: 'Beginner',
        points: 100,
        isPublished: false
    });

    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null); // For editing sections
    const [sections, setSections] = useState<Section[]>([]);
    const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
    const [editingSection, setEditingSection] = useState<Section | null>(null);
    const [sectionForm, setSectionForm] = useState({
        title: '',
        type: 'text' as 'text' | 'question',
        content: '',
        order: 0,
        provider: 'qiskit' as 'qiskit' | 'dwave' | 'ortools',
        boilerplateCode: '',
        targetAnswer: '',
        explanation: ''
    });

    // Approvals State
    const [students, setStudents] = useState([]);
    const [fetchingStudents, setFetchingStudents] = useState(false);

    useEffect(() => {
        fetchCourses();
    }, []);

    useEffect(() => {
        if (activeSubTab === 'approvals') fetchStudents();
    }, [activeSubTab]);

    const fetchCourses = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/admin/academy/courses');
            setCourses(res.data);
        } catch (err) {
            toast.error('Failed to load courses');
        } finally {
            setLoading(false);
        }
    };

    const fetchStudents = async () => {
        setFetchingStudents(true);
        try {
            const res = await axios.get('/api/admin/academy/students');
            setStudents(res.data);
        } catch (err) {
            toast.error('Failed to load students');
        } finally {
            setFetchingStudents(false);
        }
    };

    const handleSaveCourse = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingCourse) {
                await axios.put(`/api/admin/academy/courses/${editingCourse._id}`, courseForm);
                toast.success('Course updated');
            } else {
                await axios.post('/api/admin/academy/courses', courseForm);
                toast.success('Course created');
            }
            setIsModalOpen(false);
            fetchCourses();
        } catch (err) {
            toast.error('Operation failed');
        }
    };

    const fetchSections = async (courseId: string) => {
        try {
            const res = await axios.get(`/api/admin/academy/courses/${courseId}/sections`);
            setSections(res.data);
        } catch (err) {
            toast.error('Failed to load sections');
        }
    };

    const handleSaveSection = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCourse) return;

        try {
            const data = { ...sectionForm, courseId: selectedCourse._id };
            if (editingSection) {
                await axios.put(`/api/admin/academy/sections/${editingSection._id}`, data);
                toast.success('Section updated');
            } else {
                await axios.post('/api/admin/academy/sections', data);
                toast.success('Section added');
            }
            setIsSectionModalOpen(false);
            fetchSections(selectedCourse._id);
        } catch (err) {
            toast.error('Section save failed');
        }
    };

    const handleApprove = async (userId: string, approve: boolean) => {
        try {
            await axios.put(`/api/admin/academy/students/${userId}`, { isApproved: approve });
            toast.success(approve ? 'Student Approved' : 'Student Denied');
            fetchStudents();
        } catch (err) {
            toast.error('Operation failed');
        }
    };

    // --- RENDER VIEWS ---

    // View: Section Editor
    if (selectedCourse) {
        return (
            <div className="space-y-6 animate-in fade-in duration-500">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => setSelectedCourse(null)}
                            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900">{selectedCourse.title}</h2>
                            <p className="text-slate-500 text-sm">Curriculum & Interactive Challenges</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => {
                            setEditingSection(null);
                            setSectionForm({
                                title: '', type: 'text', content: '', order: sections.length + 1,
                                provider: 'qiskit', boilerplateCode: '', targetAnswer: '', explanation: ''
                            });
                            setIsSectionModalOpen(true);
                        }}
                        className="bg-[rgb(27,176,206)] hover:bg-[rgb(27,176,206)]/90 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-medium transition-all shadow-lg shadow-[rgb(27,176,206)]/20"
                    >
                        <Plus size={18} /> Add Section
                    </button>
                </div>

                <div className="grid gap-4">
                    {sections.length === 0 ? (
                        <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-3xl">
                            <BookOpen size={48} className="mx-auto text-slate-300 mb-4" />
                            <p className="text-slate-500">No sections added yet. Start by adding a lesson or challenge.</p>
                        </div>
                    ) : (
                        sections.sort((a, b) => a.order - b.order).map((section) => (
                            <div key={section._id} className="bg-white border border-slate-200 p-6 rounded-2xl hover:shadow-md transition-all group">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 font-bold border border-slate-100">
                                            {section.order}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-semibold text-slate-900">{section.title}</h4>
                                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                                                    section.type === 'question' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                                                }`}>
                                                    {section.type}
                                                </span>
                                            </div>
                                            <p className="text-slate-500 text-xs mt-1 truncate max-w-xl">{section.content.substring(0, 100)}...</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                            onClick={() => {
                                                setEditingSection(section);
                                                setSectionForm(section);
                                                setIsSectionModalOpen(true);
                                            }}
                                            className="p-2 text-slate-400 hover:text-[rgb(27,176,206)] hover:bg-[rgb(27,176,206)]/5 rounded-lg transition-all"
                                        >
                                            <Edit2 size={18} />
                                        </button>
                                        <button className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Section Modal */}
                {isSectionModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                        <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
                            <div className="p-6 border-b flex items-center justify-between">
                                <h3 className="text-xl font-bold text-slate-900">{editingSection ? 'Edit Section' : 'Add New Section'}</h3>
                                <button onClick={() => setIsSectionModalOpen(false)}><X size={20} /></button>
                            </div>
                            <form onSubmit={handleSaveSection} className="flex-1 overflow-auto p-8 space-y-6">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Section Title</label>
                                        <input 
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-[rgb(27,176,206)] transition-all"
                                            value={sectionForm.title}
                                            onChange={e => setSectionForm({...sectionForm, title: e.target.value})}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Type</label>
                                        <select 
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-[rgb(27,176,206)] transition-all"
                                            value={sectionForm.type}
                                            onChange={e => setSectionForm({...sectionForm, type: e.target.value as any})}
                                        >
                                            <option value="text">Educational Text</option>
                                            <option value="question">Quantum Challenge (Code)</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Lesson Content (Markdown)</label>
                                    <textarea 
                                        rows={8}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-[rgb(27,176,206)] transition-all font-mono text-sm"
                                        value={sectionForm.content}
                                        onChange={e => setSectionForm({...sectionForm, content: e.target.value})}
                                        required
                                    />
                                </div>

                                {sectionForm.type === 'question' && (
                                    <div className="space-y-6 p-6 bg-slate-50 rounded-2xl border border-slate-200">
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Solver Provider</label>
                                                <select 
                                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-[rgb(27,176,206)] transition-all"
                                                    value={sectionForm.provider}
                                                    onChange={e => setSectionForm({...sectionForm, provider: e.target.value as any})}
                                                >
                                                    <option value="qiskit">IBM Qiskit</option>
                                                    <option value="dwave">D-Wave Leap</option>
                                                    <option value="ortools">Google OR-Tools</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Target JSON Output (Exact Match)</label>
                                                <input 
                                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-[rgb(27,176,206)] transition-all font-mono text-xs"
                                                    placeholder='e.g. {"counts": {"00": 512, "11": 512}}'
                                                    value={sectionForm.targetAnswer}
                                                    onChange={e => setSectionForm({...sectionForm, targetAnswer: e.target.value})}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Boilerplate Code</label>
                                            <textarea 
                                                rows={5}
                                                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-[rgb(27,176,206)] transition-all font-mono text-xs"
                                                value={sectionForm.boilerplateCode}
                                                onChange={e => setSectionForm({...sectionForm, boilerplateCode: e.target.value})}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Educator's Explanation (Success Message)</label>
                                            <textarea 
                                                rows={2}
                                                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-[rgb(27,176,206)] transition-all text-xs"
                                                value={sectionForm.explanation}
                                                onChange={e => setSectionForm({...sectionForm, explanation: e.target.value})}
                                            />
                                        </div>
                                    </div>
                                )}
                                
                                <div className="flex gap-4 pt-4">
                                    <button 
                                        type="submit"
                                        className="flex-1 bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Save size={18} /> Save Section
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => setIsSectionModalOpen(false)}
                                        className="px-8 border border-slate-200 rounded-xl font-bold hover:bg-slate-50 transition-all"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // View: Main Dashboard (Courses or Approvals)
    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] text-[rgb(27,176,206)]">
                    <GraduationCap size={120} />
                </div>
                <div>
                    <h2 className="text-3xl font-extrabold text-slate-900 flex items-center gap-3">
                        <GraduationCap className="text-[rgb(27,176,206)]" size={32} />
                        Quantum Academy Manager
                    </h2>
                    <p className="text-slate-500 mt-2 max-w-xl">
                        Design curriculum paths, manage interactive challenges, and oversee student progress.
                    </p>
                </div>
                <div className="flex gap-3 relative z-10">
                    <button 
                        onClick={() => {
                            setEditingCourse(null);
                            setCourseForm({
                                title: '', description: '', category: 'Quantum Computing',
                                difficulty: 'Beginner', points: 100, isPublished: false
                            });
                            setIsModalOpen(true);
                        }}
                        className="bg-[rgb(27,176,206)] hover:bg-[rgb(27,176,206)]/90 text-white px-6 py-3 rounded-2xl flex items-center gap-2 font-bold transition-all shadow-lg shadow-[rgb(27,176,206)]/25 active:scale-95"
                    >
                        <Plus size={20} /> Create Course
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-2xl w-fit">
                <button 
                    onClick={() => setActiveSubTab('courses')}
                    className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
                        activeSubTab === 'courses' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    Published Courses
                </button>
                <button 
                    onClick={() => setActiveSubTab('approvals')}
                    className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
                        activeSubTab === 'approvals' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    Student Approvals
                </button>
            </div>

            {loading && activeSubTab === 'courses' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1,2,3].map(i => <div key={i} className="h-64 bg-slate-50 animate-pulse rounded-3xl border border-slate-100" />)}
                </div>
            ) : activeSubTab === 'courses' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {courses.map((course) => (
                        <div key={course._id} className="bg-white border border-slate-200 rounded-[32px] overflow-hidden group hover:border-[rgb(27,176,206)]/40 transition-all shadow-sm hover:shadow-xl hover:shadow-[rgb(27,176,206)]/5">
                            <div className="h-40 bg-slate-100 relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-br from-slate-900/5 to-transparent" />
                                <div className="absolute top-4 left-4">
                                    <span className="px-3 py-1 bg-white/90 backdrop-blur-md rounded-full text-[10px] font-black uppercase text-slate-900 border border-white/50">
                                        {course.difficulty}
                                    </span>
                                </div>
                                <div className="absolute inset-0 flex items-center justify-center opacity-10 text-slate-900">
                                    <BookOpen size={80} />
                                </div>
                            </div>
                            <div className="p-8">
                                <h3 className="text-xl font-bold text-slate-900 group-hover:text-[rgb(27,176,206)] transition-colors">{course.title}</h3>
                                <p className="text-slate-500 text-sm mt-3 line-clamp-2 leading-relaxed">
                                    {course.description}
                                </p>
                                
                                <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-[10px] font-bold border border-emerald-100">
                                            {course.points} XP
                                        </div>
                                        <div className={`px-3 py-1 rounded-full text-[10px] font-bold border ${
                                            course.isPublished ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-slate-50 text-slate-400 border-slate-200'
                                        }`}>
                                            {course.isPublished ? 'Published' : 'Draft'}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={() => {
                                                setSelectedCourse(course);
                                                fetchSections(course._id);
                                            }}
                                            className="p-2.5 text-slate-400 hover:text-[rgb(27,176,206)] hover:bg-[rgb(27,176,206)]/5 rounded-2xl transition-all"
                                            title="Edit Curriculum"
                                        >
                                            <Layers size={20} />
                                        </button>
                                        <button 
                                            onClick={() => {
                                                setEditingCourse(course);
                                                setCourseForm(course);
                                                setIsModalOpen(true);
                                            }}
                                            className="p-2.5 text-slate-400 hover:text-[rgb(27,176,206)] hover:bg-[rgb(27,176,206)]/5 rounded-2xl transition-all"
                                        >
                                            <Edit2 size={20} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-500 uppercase tracking-wider">
                                <tr>
                                    <th className="px-8 py-5">Student</th>
                                    <th className="px-8 py-5">Institution</th>
                                    <th className="px-8 py-5">Applied Date</th>
                                    <th className="px-8 py-5 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {fetchingStudents ? (
                                    <tr><td colSpan={4} className="px-8 py-10 text-center animate-pulse">Loading queue...</td></tr>
                                ) : students.length === 0 ? (
                                    <tr><td colSpan={4} className="px-8 py-20 text-center text-slate-400 font-medium italic">The approval queue is currently empty.</td></tr>
                                ) : (
                                    students.map((student: any) => (
                                        <tr key={student._id} className="hover:bg-slate-50 transition-colors group">
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-black border border-emerald-100">
                                                        {student.email[0].toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-900">{student.firstName} {student.lastName}</p>
                                                        <p className="text-xs text-slate-500">{student.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5 font-medium text-slate-600">{student.company || 'N/A'}</td>
                                            <td className="px-8 py-5 text-slate-400">{new Date(student.createdAt).toLocaleDateString()}</td>
                                            <td className="px-8 py-5 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button 
                                                        onClick={() => handleApprove(student._id, true)}
                                                        className="px-4 py-1.5 bg-emerald-500 text-white rounded-lg font-bold hover:bg-emerald-600 transition-all shadow-sm"
                                                    >
                                                        Approve
                                                    </button>
                                                    <button 
                                                        onClick={() => handleApprove(student._id, false)}
                                                        className="px-4 py-1.5 border border-slate-200 text-slate-500 rounded-lg font-bold hover:bg-slate-50 transition-all"
                                                    >
                                                        Deny
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Course Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-[40px] w-full max-w-xl shadow-2xl overflow-hidden border border-white/20">
                        <div className="p-8 border-b flex items-center justify-between">
                            <h3 className="text-2xl font-bold text-slate-900">{editingCourse ? 'Edit Course' : 'Launch New Course'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-50 rounded-full transition-all"><X size={24} /></button>
                        </div>
                        <form onSubmit={handleSaveCourse} className="p-10 space-y-8">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">Course Title</label>
                                <input 
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 outline-none focus:border-[rgb(27,176,206)] transition-all shadow-inner"
                                    value={courseForm.title}
                                    onChange={e => setCourseForm({...courseForm, title: e.target.value})}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">Description</label>
                                <textarea 
                                    rows={3}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 outline-none focus:border-[rgb(27,176,206)] transition-all shadow-inner"
                                    value={courseForm.description}
                                    onChange={e => setCourseForm({...courseForm, description: e.target.value})}
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">Difficulty</label>
                                    <select 
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 outline-none focus:border-[rgb(27,176,206)] transition-all shadow-inner"
                                        value={courseForm.difficulty}
                                        onChange={e => setCourseForm({...courseForm, difficulty: e.target.value as any})}
                                    >
                                        <option>Beginner</option>
                                        <option>Intermediate</option>
                                        <option>Advanced</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">Total XP Points</label>
                                    <input 
                                        type="number"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 outline-none focus:border-[rgb(27,176,206)] transition-all shadow-inner"
                                        value={courseForm.points}
                                        onChange={e => setCourseForm({...courseForm, points: parseInt(e.target.value)})}
                                        required
                                    />
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-3 p-5 bg-slate-50 rounded-2xl border border-slate-200">
                                <input 
                                    type="checkbox" 
                                    id="publish"
                                    className="w-5 h-5 accent-[rgb(27,176,206)]"
                                    checked={courseForm.isPublished}
                                    onChange={e => setCourseForm({...courseForm, isPublished: e.target.checked})}
                                />
                                <label htmlFor="publish" className="text-sm font-bold text-slate-700 cursor-pointer">Publish Course immediately</label>
                            </div>

                            <button 
                                type="submit"
                                className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-lg hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10"
                            >
                                {editingCourse ? 'Update Course Metadata' : 'Initialize Course Structure'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
