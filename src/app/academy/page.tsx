"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { 
    BookOpen, Trophy, Award, Clock, ArrowRight, 
    Lock, CheckCircle, Play, GraduationCap, ChevronRight 
} from 'lucide-react';
import Link from 'next/link';
import axios from 'axios';
import { generateCertificate } from '@/lib/certificate-generator';

export default function AcademyDashboard() {
    const { isAuthenticated, user } = useAuth();
    const [courses, setCourses] = useState([]);
    const [progress, setProgress] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [coursesRes, progressRes] = await Promise.all([
                axios.get('/api/academy/courses'),
                isAuthenticated && user?.email 
                    ? axios.get(`/api/academy/progress?email=${encodeURIComponent(user.email)}`) 
                    : Promise.resolve({ data: [] })
            ]);
            setCourses(coursesRes.data);
            setProgress(progressRes.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const getProgressForCourse = (courseId: string) => {
        return progress.find(p => p.courseId === courseId);
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 h-20 flex items-center justify-between px-8 sticky top-0 z-40">
                <div className="flex items-center gap-4">
                    <Link href="/">
                        <img src="/logo.png" alt="Quantum Guru" className="h-[40px] md:h-[62px] w-auto object-contain cursor-pointer" />
                    </Link>
                    <div className="h-6 w-px bg-slate-200 mx-2" />
                    <div className="flex items-center gap-2 text-slate-900 font-bold">
                        <GraduationCap className="text-[rgb(27,176,206)]" size={24} />
                        Academy
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    {isAuthenticated ? (
                        <div className="flex items-center gap-3">
                            <div className="text-right">
                                <p className="text-xs font-bold text-slate-900">{user?.email}</p>
                                <p className="text-[10px] text-slate-500 uppercase tracking-wider">{user?.role}</p>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-[rgb(27,176,206)]/10 flex items-center justify-center text-[rgb(27,176,206)] font-black border border-[rgb(27,176,206)]/20">
                                {user?.email?.[0]?.toUpperCase()}
                            </div>
                        </div>
                    ) : (
                        <Link href="/login?redirect=/academy" className="bg-[#3066bb] text-white px-6 py-2 rounded-xl font-bold text-sm shadow-lg shadow-[#3066bb]/20 hover:bg-[#3066bb]/90 transition-all">
                            Login to Start
                        </Link>
                    )}
                </div>
            </header>

            <main className="max-w-7xl mx-auto py-12 px-8">
                {/* Hero Section */}
                <div className="mb-16 relative rounded-[40px] overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-[rgb(27,176,206)]/30 text-white p-12 shadow-2xl border border-white/5">
                    <div className="absolute top-0 right-0 p-12 opacity-10">
                        <Trophy size={200} className="text-[rgb(27,176,206)]" />
                    </div>
                    <div className="relative z-10 max-w-2xl">
                        <h1 className="text-4xl md:text-5xl font-black mb-6 leading-tight">
                            Elevate Your <br />
                            <span className="text-[rgb(27,176,206)]">Quantum Intelligence</span>
                        </h1>
                        <p className="text-slate-400 text-lg mb-8 leading-relaxed">
                            Structured learning paths designed by industry experts. From basic annealing to advanced hybrid solvers—master the full quantum stack.
                        </p>
                        <div className="flex items-center gap-8">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-[rgb(27,176,206)]">
                                    <BookOpen size={24} />
                                </div>
                                <div>
                                    <p className="text-xl font-bold">{courses.length}</p>
                                    <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Courses</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-emerald-400">
                                    <Award size={24} />
                                </div>
                                <div>
                                    <p className="text-xl font-bold">{progress.filter(p => p.isCompleted).length}</p>
                                    <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Certificates</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Course Grid */}
                <div className="space-y-8">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-black text-slate-900">Learning Path</h2>
                        <div className="flex gap-2">
                            {['All', 'Beginner', 'Intermediate', 'Advanced'].map(cat => (
                                <button key={cat} className="px-4 py-1.5 rounded-full text-xs font-bold bg-white border border-slate-200 text-slate-500 hover:border-[rgb(27,176,206)] hover:text-[rgb(27,176,206)] transition-all">
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {loading ? (
                            [1,2,3].map(i => <div key={i} className="h-80 bg-white rounded-[32px] animate-pulse" />)
                        ) : (
                            courses.map((course: any) => {
                                const courseProgress = getProgressForCourse(course._id);
                                const isEnrolled = !!courseProgress;
                                const isCompleted = courseProgress?.isCompleted;
                                const completionPercent = isEnrolled ? (courseProgress.completedSections.length / (course.totalSections || 5) * 100) : 0;

                                return (
                                    <div key={course._id} className="bg-white border border-slate-200 rounded-[32px] overflow-hidden group hover:shadow-2xl hover:shadow-[rgb(27,176,206)]/5 transition-all flex flex-col">
                                        <div className="h-48 bg-slate-100 relative">
                                            <div className="absolute top-4 left-4 flex gap-2">
                                                <span className="px-3 py-1 bg-white/90 backdrop-blur-md rounded-full text-[10px] font-black uppercase text-slate-900 border border-white/50">
                                                    {course.difficulty}
                                                </span>
                                                {isCompleted && (
                                                    <span className="px-3 py-1 bg-emerald-500 text-white rounded-full text-[10px] font-black uppercase border border-emerald-400 flex items-center gap-1 shadow-lg shadow-emerald-500/20">
                                                        <Award size={10} /> Certified
                                                    </span>
                                                )}
                                            </div>
                                            <div className="absolute inset-0 flex items-center justify-center opacity-10 group-hover:scale-110 transition-transform duration-500 text-slate-900">
                                                <BookOpen size={100} />
                                            </div>
                                        </div>
                                        <div className="p-8 flex-1 flex flex-col">
                                            <h3 className="text-xl font-bold text-slate-900 mb-3">{course.title}</h3>
                                            <p className="text-slate-500 text-sm line-clamp-2 mb-8 leading-relaxed">
                                                {course.description}
                                            </p>
                                            
                                            <div className="mt-auto space-y-4">
                                                {isEnrolled && (
                                                    <div className="space-y-2">
                                                        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
                                                            <span className="text-slate-400">Progress</span>
                                                            <span className="text-[rgb(27,176,206)]">{Math.round(completionPercent)}%</span>
                                                        </div>
                                                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                            <div 
                                                                className="h-full bg-[rgb(27,176,206)] transition-all duration-1000"
                                                                style={{ width: `${completionPercent}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="grid grid-cols-1 gap-3">
                                                    <Link 
                                                        href={`/academy/course/${course._id}`}
                                                        className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${
                                                            isEnrolled 
                                                            ? 'bg-[#3066bb] text-white hover:bg-[#3066bb]/90 shadow-[#3066bb]/20' 
                                                            : 'bg-[#3066bb]/5 text-[#3066bb] hover:bg-[#3066bb] hover:text-white hover:shadow-[#3066bb]/20'
                                                        }`}
                                                    >
                                                        {isEnrolled ? (
                                                            <>Continue Learning <ChevronRight size={18} /></>
                                                        ) : (
                                                            <>Enroll Now <Play size={18} /></>
                                                        )}
                                                    </Link>

                                                    {isCompleted && (
                                                        <button 
                                                            onClick={() => generateCertificate({
                                                                userName: `${user?.firstName || 'Student'} ${user?.lastName || ''}`,
                                                                courseName: course.title,
                                                                date: new Date().toLocaleString()
                                                            })}
                                                            className="w-full py-4 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-100 transition-all shadow-sm"
                                                        >
                                                            <Award size={18} /> Download Certificate
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
