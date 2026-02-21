"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
    email: string;
    name?: string;
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isInitializing: boolean;
    login: (email: string) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isInitializing, setIsInitializing] = useState(true);

    useEffect(() => {
        // Check local storage on mount
        const stored = localStorage.getItem('quantum_session');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                // Basic validation: check if not expired (optional, for now just check existence)
                setUser({ email: parsed.email, name: parsed.email.split('@')[0] });
                setIsAuthenticated(true);
            } catch (e) {
                console.error("Invalid session", e);
                localStorage.removeItem('quantum_session');
            }
        }
        setIsInitializing(false);
    }, []);

    const login = (email: string) => {
        const newUser = { email, name: email.split('@')[0] };
        setUser(newUser);
        setIsAuthenticated(true);
        localStorage.setItem('quantum_session', JSON.stringify({ ...newUser, timestamp: Date.now() }));
    };

    const logout = () => {
        setUser(null);
        setIsAuthenticated(false);
        localStorage.removeItem('quantum_session');
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
