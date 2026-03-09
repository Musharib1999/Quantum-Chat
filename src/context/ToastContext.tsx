"use client";

import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((message: string, type: ToastType = 'info') => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 3000);
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-3">
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        className={`
                            flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border bg-card/95 backdrop-blur-md
                            animate-in slide-in-from-right-full duration-300
                            ${toast.type === 'success' ? 'border-green-500/50 text-green-500' :
                                toast.type === 'error' ? 'border-red-500/50 text-red-500' :
                                    'border-blue-500/50 text-blue-500'}
                        `}
                    >
                        {toast.type === 'success' && <CheckCircle2 size={18} />}
                        {toast.type === 'error' && <AlertCircle size={18} />}
                        {toast.type === 'info' && <Info size={18} />}
                        <span className="text-sm font-medium text-foreground">{toast.message}</span>
                        <button
                            onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                            className="ml-2 p-1 hover:bg-muted rounded-full transition-colors text-muted-foreground"
                        >
                            <X size={14} />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) throw new Error('useToast must be used within ToastProvider');
    return context;
}
