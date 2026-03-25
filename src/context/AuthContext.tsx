"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
    email: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    plan?: 'Guest' | 'Pro' | 'Enterprise';
    role?: string;
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
                        if (!data.error) {
                            setUser(prev => {
                                if (!prev) return prev;
                                const updated = {
                                    ...prev,
                                    tokenLimit: data.tokenLimit,
                                    tokensUsed: data.tokensUsed,
                                    simMinutesLimit: data.simMinutesLimit ?? 5,
                                    simMinutesUsed: data.simMinutesUsed ?? 0,
                                    apiKey: data.apiKey || ''
                                };
                                localStorage.setItem('quantum_session', JSON.stringify({ ...updated, timestamp: Date.now() }));
                                return updated;
                            });
                        }
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
