"use client";

import React, { useState } from 'react';
import { X, Key, AlertTriangle, CheckCircle, Loader2, Save } from 'lucide-react';

interface PasswordModalProps {
    setShowPasswordModal: (show: boolean) => void;
}

export default function PasswordModal({ setShowPasswordModal }: PasswordModalProps) {
    const [currentPassword, setCurrentPassword] = useState("");
    const [newAdminPassword, setNewAdminPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [passwordError, setPasswordError] = useState("");
    const [passwordSuccess, setPasswordSuccess] = useState(false);
    const [passwordLoading, setPasswordLoading] = useState(false);

    const handleAdminPasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordError("");
        setPasswordSuccess(false);

        if (newAdminPassword !== confirmPassword) {
            setPasswordError("New passwords do not match");
            return;
        }

        if (newAdminPassword.length < 6) {
            setPasswordError("New password must be at least 6 characters");
            return;
        }

        setPasswordLoading(true);
        try {
            const res = await fetch('/api/admin/auth/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentPassword, newPassword: newAdminPassword })
            });
            const data = await res.json();

            if (res.ok) {
                setPasswordSuccess(true);
                setTimeout(() => {
                    setShowPasswordModal(false);
                    setCurrentPassword("");
                    setNewAdminPassword("");
                    setConfirmPassword("");
                    setPasswordSuccess(false);
                }, 2000);
            } else {
                setPasswordError(data.error || "Failed to change password");
            }
        } catch (error) {
            setPasswordError("A network error occurred.");
        } finally {
            setPasswordLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-card w-full max-w-sm rounded-2xl border border-border shadow-2xl p-6 relative animate-in zoom-in-95 duration-200">
                <button
                    onClick={() => setShowPasswordModal(false)}
                    className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
                >
                    <X size={20} />
                </button>

                <h3 className="text-xl font-bold mb-6 text-[#0F172A]">
                    Security Settings
                </h3>

                <form onSubmit={handleAdminPasswordChange} className="space-y-4">
                    {passwordError && (
                        <div className="text-sm text-red-500 bg-red-50 p-3 rounded-xl border border-red-100 flex items-center gap-2">
                             {passwordError}
                        </div>
                    )}
                    {passwordSuccess && (
                        <div className="text-sm text-green-600 bg-green-50 p-3 rounded-xl border border-green-100 flex items-center gap-2">
                             Password updated successfully!
                        </div>
                    )}

                    <div>
                        <label className="text-xs font-semibold text-[#0F172A] mb-1.5 block">Current password</label>
                        <input
                            type="password"
                            required
                            className="w-full p-3 bg-white border border-[rgb(27,176,206)]/30 rounded-xl outline-none focus:ring-1 focus:ring-[rgb(27,176,206)] font-mono text-sm"
                            value={currentPassword}
                            onChange={e => setCurrentPassword(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-[#0F172A] mb-1.5 block">New password</label>
                        <input
                            type="password"
                            required
                            className="w-full p-3 bg-white border border-[rgb(27,176,206)]/30 rounded-xl outline-none focus:ring-1 focus:ring-[rgb(27,176,206)] font-mono text-sm"
                            value={newAdminPassword}
                            onChange={e => setNewAdminPassword(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-[#0F172A] mb-1.5 block">Confirm new password</label>
                        <input
                            type="password"
                            required
                            className="w-full p-3 bg-white border border-[rgb(27,176,206)]/30 rounded-xl outline-none focus:ring-1 focus:ring-[rgb(27,176,206)] font-mono text-sm"
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={passwordLoading || passwordSuccess}
                        className="w-full mt-2 bg-[rgb(48,102,187)] hover:bg-[#255299] text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-all font-sans shadow-sm shadow-[rgb(27,176,206)]/20"
                    >
                        {passwordLoading ? <Loader2 className="animate-spin w-5 h-5" /> : "Update Password"}
                    </button>
                </form>
            </div>
        </div>
    );
}
