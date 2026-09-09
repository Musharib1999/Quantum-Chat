"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
    email: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    plan?: 'Guest' | 'Pro' | 'Enterprise';
    role?: 'user' | 'admin' | 'enterprise' | 'builder' | 'demo';
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isInitializing, setIsInitializing] = useState(true);

    useEffect(() => {
        if (!user || user.role !== 'demo' || !user.demoExpiresAt) return;

        const checkExpiry = () => {
            const expTime = new Date(user.demoExpiresAt!).getTime();
            const now = Date.now();
            if (now >= expTime) {
                console.log("Demo session expired, logging out...");
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
                setUser({
                    email: parsed.email,
                    name: parsed.name || parsed.firstName || parsed.email.split('@')[0],
                    firstName: parsed.firstName || '',
                    lastName: parsed.lastName || '',
                    phone: parsed.phone || '',
                    plan: parsed.plan || 'Guest',
                    role: parsed.role || 'user',
                    tokenLimit: parsed.tokenLimit,
                    tokensUsed: parsed.tokensUsed,
                    simMinutesLimit: parsed.simMinutesLimit,
                    simMinutesUsed: parsed.simMinutesUsed,
                    apiKey: parsed.apiKey || '',
                });
                setIsAuthenticated(true);

                // Fetch fresh user data from the backend to keep token limits synced
                fetch(`/api/auth/me?email=${encodeURIComponent(parsed.email)}`)
                    .then(res => res.json())
                    .then(data => {
                        if (data.error) {
                            logout();
                            return;
                        }

                        // Demo expiration check on mount
                        if (data.role === 'demo' && data.demoExpiresAt && new Date() > new Date(data.demoExpiresAt)) {
                            console.log("Demo expired on mount, logging out...");
                            logout();
                            return;
                        }

                        setUser(prev => {
                            if (!prev) return prev;
                            const updated = {
                                ...prev,
                                tokenLimit: data.tokenLimit,
                                tokensUsed: data.tokensUsed,
                                simMinutesLimit: data.simMinutesLimit ?? 5,
                                simMinutesUsed: data.simMinutesUsed ?? 0,
                                apiKey: data.apiKey || '',
                                role: data.role || 'user',
                                demoExpiresAt: data.demoExpiresAt || undefined
                            };
                            localStorage.setItem('quantum_session', JSON.stringify({ ...updated, timestamp: Date.now() }));
                            return updated;
                        });
                    })
                    .catch(err => console.error("Failed to refresh user tokens", err));

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
            role: userData.role || 'user',
            demoExpiresAt: userData.demoExpiresAt || undefined,
            tokenLimit: userData.tokenLimit,
            tokensUsed: userData.tokensUsed,
            simMinutesLimit: userData.simMinutesLimit ?? 5,
            simMinutesUsed: userData.simMinutesUsed ?? 0,
            apiKey: userData.apiKey || '',
        };
        setUser(newUser);
        setIsAuthenticated(true);
        localStorage.setItem('quantum_session', JSON.stringify({ ...newUser, timestamp: Date.now() }));
    };

    const logout = () => {
        setUser(null);
        setIsAuthenticated(false);
        localStorage.removeItem('quantum_session');
        sessionStorage.removeItem('qg_session_tokens_used');

        // Comprehensive cleanup: purge all cached user data, IDE projects, and chat sessions
        if (typeof window !== 'undefined') {
            const keysToRemove: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (
                    key.startsWith('quantum_ide_') ||
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
            localStorage.setItem('quantum_session', JSON.stringify({ ...updated, timestamp: Date.now() }));
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
