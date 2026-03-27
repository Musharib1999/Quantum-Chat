import React, { useRef, useEffect, useState } from 'react';
import { LogOut, Lock, Unlock, ArrowRight, User as UserIcon, Zap, Layout, Key, Copy, Check, Shield } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import UserPasswordModal from './UserPasswordModal';

interface UserProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function UserProfileModal({ isOpen, onClose }: UserProfileModalProps) {
    const { user, isAuthenticated, logout } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const cardRef = useRef<HTMLDivElement>(null);
    const [copied, setCopied] = useState(false);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

    // Close when clicking anywhere outside the card
    useEffect(() => {
        if (!isOpen || isPasswordModalOpen) return;
        const handleMouseDown = (e: MouseEvent) => {
            if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleMouseDown, true);
        return () => document.removeEventListener('mousedown', handleMouseDown, true);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleLogin = () => {
        const redirect = encodeURIComponent(pathname || '/market');
        router.push(`/login?redirect=${redirect}`);
        onClose();
    };

    const handleLogout = () => {
        logout();
        // Stay on current page but trigger re-render/logic check
        onClose();
    };

    const handleTryPortfolio = () => {
        if (isAuthenticated) {
            router.push('/industry');
        } else {
            router.push(`/login?redirect=${encodeURIComponent('/industry')}`);
        }
        onClose();
    };

    const handleCopyKey = () => {
        if (user?.apiKey) {
            navigator.clipboard.writeText(user.apiKey);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div
            ref={cardRef}
            style={{ position: 'fixed', top: '72px', right: '16px', zIndex: 201, width: '260px' }}
            className="bg-card/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-top-4 duration-200 overflow-hidden"
        >
            {/* User Info Header */}
            <div className="p-5 border-b border-border/40">
                {isAuthenticated && user ? (
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold">
                                {user.firstName && user.lastName 
                                    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
                                    : (user.firstName || user.name || 'U').substring(0, 2).toUpperCase()}
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-sm font-semibold text-foreground truncate">
                                    {user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.name || 'Quantum User'}
                                </span>
                                <span className="text-[11px] text-muted-foreground truncate">{user.email}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-green-500/5 border border-green-500/10 w-fit">
                            <Zap size={12} className="text-green-500" />
                            <span className="text-[11px] font-bold text-green-600 uppercase tracking-wider">{user.plan || 'PRO'} PLAN</span>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-muted border border-border flex items-center justify-center text-muted-foreground">
                                <UserIcon size={20} />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-semibold text-foreground">Guest Explorer</span>
                                <span className="text-[11px] text-muted-foreground">Limited workspace access</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="p-2 space-y-1">
                {/* Module Highlight CTA - hidden when already in industry module */}
                {!pathname?.startsWith('/industry') && (
                    <button
                        onClick={handleTryPortfolio}
                        className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all group shadow-lg shadow-primary/20"
                    >
                        <div className="flex items-center gap-2.5">
                            <Layout size={16} />
                            <span className="text-sm font-semibold">Portfolio Optimization</span>
                        </div>
                        <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                )}

                {/* Password Change Button */}
                {isAuthenticated && (
                    <button
                        onClick={() => setIsPasswordModalOpen(true)}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:text-primary hover:bg-primary/5 transition-all"
                    >
                        <Shield size={16} />
                        <span>Security Settings</span>
                    </button>
                )}

                {/* API Key Section */}
                {isAuthenticated && user?.apiKey && (
                    <div className="mx-2 mt-4 p-3 rounded-xl bg-primary/5 border border-primary/10 space-y-2">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-primary uppercase tracking-wider">
                            <Key size={12} />
                            <span>Developer API Key</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <code className="flex-1 text-[10px] font-mono p-1.5 bg-background border border-border/50 rounded text-muted-foreground truncate">
                                {user.apiKey}
                            </code>
                            <button 
                                onClick={handleCopyKey}
                                className="p-1.5 hover:bg-primary/10 rounded transition-colors text-primary"
                                title="Copy to clipboard"
                            >
                                {copied ? <Check size={14} /> : <Copy size={14} />}
                            </button>
                        </div>
                    </div>
                )}

                <div className="pt-2">
                    {isAuthenticated ? (
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-red-500 hover:bg-red-500/5 transition-all"
                        >
                            <LogOut size={16} />
                            <span>Sign Out</span>
                        </button>
                    ) : (
                        <button
                            onClick={handleLogin}
                            className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all"
                        >
                            <Unlock size={16} />
                            <span>Sign In</span>
                        </button>
                    )}
                </div>
            </div>
            
            {/* Sub-modals */}
            <UserPasswordModal 
                isOpen={isPasswordModalOpen} 
                onClose={() => setIsPasswordModalOpen(false)} 
            />
        </div>
    );
}
