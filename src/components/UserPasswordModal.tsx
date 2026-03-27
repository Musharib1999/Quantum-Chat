"use client";

import React, { useState } from 'react';
import { X, Lock, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface UserPasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function UserPasswordModal({ isOpen, onClose }: UserPasswordModalProps) {
    const { user } = useAuth();
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess(false);

        if (!user?.email) {
            setError("Session expired. Please sign in again.");
            return;
        }

        if (newPassword !== confirmPassword) {
            setError("New passwords do not match");
            return;
        }

        if (newPassword.length < 8) {
            setError("Password must be at least 8 characters");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    email: user.email,
                    currentPassword, 
                    newPassword 
                })
            });
            const data = await res.json();

            if (res.ok) {
                setSuccess(true);
                setTimeout(() => {
                    onClose();
                    setCurrentPassword("");
                    setNewPassword("");
                    setConfirmPassword("");
                    setSuccess(false);
                }, 2000);
            } else {
                setError(data.error || "Failed to update password");
            }
        } catch (e) {
            setError("A network error occurred. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-sm rounded-[24px] border border-slate-200 shadow-2xl p-7 relative animate-in zoom-in-95 duration-200">
                <button
                    onClick={onClose}
                    className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 transition-colors"
                >
                    <X size={18} />
                </button>

                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-[#3066bb]/10 flex items-center justify-center text-[#3066bb]">
                        <Lock size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 leading-none">Security Settings</h3>
                        <p className="text-[11px] text-slate-500 mt-1.5 font-medium uppercase tracking-tight">Update your credentials</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="text-[12px] font-medium text-red-600 bg-red-50 p-3 rounded-xl border border-red-100 flex items-center gap-2 animate-in slide-in-from-top-1">
                             <AlertCircle size={14} />
                             {error}
                        </div>
                    )}
                    {success && (
                        <div className="text-[12px] font-medium text-green-700 bg-green-50 p-3 rounded-xl border border-green-100 flex items-center gap-2 animate-in slide-in-from-top-1">
                             <CheckCircle size={14} />
                             Security successfully patched!
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Current Password</label>
                        <input
                            type="password"
                            required
                            className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-[#3066bb] text-sm text-slate-900 transition-all font-mono"
                            placeholder="••••••••"
                            value={currentPassword}
                            onChange={e => setCurrentPassword(e.target.value)}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">New Password</label>
                        <input
                            type="password"
                            required
                            className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-[#3066bb] text-sm text-slate-900 transition-all font-mono"
                            placeholder="••••••••"
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Confirm New Password</label>
                        <input
                            type="password"
                            required
                            className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-[#3066bb] text-sm text-slate-900 transition-all font-mono"
                            placeholder="••••••••"
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading || success}
                        className="w-full mt-2 bg-[#3066bb] hover:bg-[#255299] text-white py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-all shadow-lg shadow-[#3066bb]/20 active:scale-[0.98]"
                    >
                        {loading ? <Loader2 className="animate-spin w-5 h-5" /> : "Update Credentials"}
                    </button>
                    
                    <p className="text-center text-[10px] text-slate-400 font-medium">
                        Ensure your password is at least 8 characters long for high security.
                    </p>
                </form>
            </div>
        </div>
    );
}
