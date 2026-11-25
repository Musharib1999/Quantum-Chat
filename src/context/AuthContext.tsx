"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { isDemoRole, normalizeRole, UserRole } from '@/lib/roles';

interface User {
    email: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    plan?: 'Guest' | 'Pro' | 'Enterprise';
    role?: UserRole;
    demoExpiresAt?: string;
    tokenLimit?: number;
    tokensUsed?: number;
    simMinutesLimit?: number;
    simMinutesUsed?: number;
    apiKey?: string;
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isInitializing: boolean;
    login: (userData: Partial<User> & { email: string }) => void;
    logout: () => void;
    updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Persist only non-sensitive display/UI profile fields to localStorage (never apiKey or secrets). */
function persistSessionProfile(u: User) {
    const { apiKey: _omitApiKey, ...safeProfile } = u;
    localStorage.setItem('quantum_session', JSON.stringify({ ...safeProfile, timestamp: Date.now() }));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isInitializing, setIsInitializing] = useState(true);

    useEffect(() => {
        if (!user || !isDemoRole(user.role) || !user.demoExpiresAt) return;

        const checkExpiry = () => {
            const expTime = new Date(user.demoExpiresAt!).getTime();
            const now = Date.now();
            if (now >= expTime) {
                logout();
            }
        };

        checkExpiry();
        const interval = setInterval(checkExpiry, 10000);
        return () => clearInterval(interval);
    }, [user]);

    useEffect(() => {
        const stored = localStorage.getItem('quantum_session');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                const hydrated: User = {
                    email: parsed.email,
                    name: parsed.name || parsed.firstName || parsed.email.split('@')[0],
                    firstName: parsed.firstName || '',
                    lastName: parsed.lastName || '',
                    phone: parsed.phone || '',
                    plan: parsed.plan || 'Guest',
                    role: normalizeRole(parsed.role),
                    tokenLimit: parsed.tokenLimit,
                    tokensUsed: parsed.tokensUsed,
                    simMinutesLimit: parsed.simMinutesLimit,
                    simMinutesUsed: parsed.simMinutesUsed,
                    // Never trust or read apiKey from localStorage; populated in-memory from verified /api/auth/me
                    apiKey: '',
                };
                // Scrub any legacy apiKey previously stored in localStorage
                if (parsed.apiKey) {
                    persistSessionProfile(hydrated);
                }
                setUser(hydrated);
                setIsAuthenticated(true);

                // Identity comes strictly from the verified HttpOnly user_session cookie (no ?email= param)
                fetch('/api/auth/me')
                    .then(res => {
                        if (res.status === 401) {
                            logout();
                            return null;
                        }
                        if (!res.ok) return null; // Transient backend/network glitch: do not logout
                        return res.json();
                    })
                    .then(data => {
                        if (!data) return;
                        if (data.error) {
                            if (data.status === 401 || data.error?.toLowerCase()?.includes("unauthorized") || data.error?.toLowerCase()?.includes("invalid session")) {
                                logout();
                            }
                            return;
                        }

                        // Demo expiration check on mount
                        if (isDemoRole(data.role) && data.demoExpiresAt && new Date() > new Date(data.demoExpiresAt)) {
                            logout();
                            return;
                        }

                        setUser(prev => {
                            if (!prev) return prev;
                            const updated: User = {
                                ...prev,
                                email: data.email || prev.email,
                                firstName: data.firstName ?? prev.firstName,
                                lastName: data.lastName ?? prev.lastName,
                                tokenLimit: data.tokenLimit,
                                tokensUsed: data.tokensUsed,
                                simMinutesLimit: data.simMinutesLimit ?? 5,
                                simMinutesUsed: data.simMinutesUsed ?? 0,
                                apiKey: data.apiKey || '',
                                role: normalizeRole(data.role),
                                demoExpiresAt: data.demoExpiresAt || undefined
                            };
                            persistSessionProfile(updated);
                            return updated;
                        });
                    })
                    .catch(err => console.error("Failed to refresh user session", err));

            } catch (e) {
                console.error("Invalid session", e);
                localStorage.removeItem('quantum_session');
            }
        }
        setIsInitializing(false);
    }, []);

    const login = (userData: Partial<User> & { email: string }) => {
        const newUser: User = {
            email: userData.email,
            name: userData.firstName || userData.name || userData.email.split('@')[0],
            firstName: userData.firstName || '',
            lastName: userData.lastName || '',
            phone: userData.phone || '',
            plan: userData.plan || 'Guest',
            role: normalizeRole(userData.role),
            demoExpiresAt: userData.demoExpiresAt || undefined,
            tokenLimit: userData.tokenLimit,
            tokensUsed: userData.tokensUsed,
            simMinutesLimit: userData.simMinutesLimit ?? 5,
            simMinutesUsed: userData.simMinutesUsed ?? 0,
            apiKey: userData.apiKey || '',
        };
        setUser(newUser);
        setIsAuthenticated(true);
        persistSessionProfile(newUser);
    };

    const logout = () => {
        setUser(null);
        setIsAuthenticated(false);
        localStorage.removeItem('quantum_session');
        localStorage.removeItem('qg_enterprise_studio_v1');
        sessionStorage.removeItem('qg_session_tokens_used');

        // Clean up session and pipeline state, but PRESERVE user IDE projects and code (quantum_ide_*)!
        if (typeof window !== 'undefined') {
            const keysToRemove: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (
                    key.startsWith('quantum_chat_') ||
                    key.startsWith('qg_session_') ||
                    key.startsWith('session_') ||
                    key === 'qg_selected_pipeline'
                )) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(k => localStorage.removeItem(k));
        }

        fetch('/api/auth/logout', { method: 'POST' }).catch(err => console.error("Logout cookie clear failed", err));
    };

    const updateUser = (updates: Partial<User>) => {
        setUser(prev => {
            if (!prev) return prev;
            const updated = { ...prev, ...updates };
            persistSessionProfile(updated);
            return updated;
        });
    };

    return (
        <AuthContext.Provider value={{ user, isAuthenticated, isInitializing, login, logout, updateUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
