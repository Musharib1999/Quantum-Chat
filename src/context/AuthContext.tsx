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
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isInitializing: boolean;
    login: (userData: Partial<User> & { email: string }) => void;
    logout: () => void;
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
                });
                setIsAuthenticated(true);
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

    return (
        <AuthContext.Provider value={{ user, isAuthenticated, isInitializing, login, logout }}>
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
