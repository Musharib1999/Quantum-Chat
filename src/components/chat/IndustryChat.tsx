"use client";

import React, { useRef, useEffect, useState } from 'react';
import { Send, User, StopCircle, ShieldCheck } from 'lucide-react';
import MarkdownRenderer from '../MarkdownRenderer';
import QuantumChart from '../QuantumChart';
import { useQuantumChat } from '@/hooks/useQuantumChat';

interface IndustryChatProps {
    contextConfig?: any;
    placeholder?: string;
    onAnalysisTriggered?: () => void;
}

export default function IndustryChat({ contextConfig, placeholder, onAnalysisTriggered }: IndustryChatProps) {
    const {
        messages,
        inputValue,
        setInputValue,
        isTyping,
        sendMessage,
        messagesEndRef,
        scrollContainerRef,
        handleScroll,
        setShouldAutoScroll
    } = useQuantumChat('industry', contextConfig);

    const [processingStep, setProcessingStep] = useState<'generating' | 'simulating' | 'interpreting' | null>(null);
    const lastTriggeredFormRef = useRef<string | null>(null);

    // --- Industry Triggers ---
    useEffect(() => {
        if (contextConfig?.formData) {
            const formString = JSON.stringify(contextConfig.formData);
            if (formString !== lastTriggeredFormRef.current) {
                lastTriggeredFormRef.current = formString;
                const triggerMessage = `Execute Quantum Workflow for ${contextConfig.problem} in ${contextConfig.industry} using ${contextConfig.hardware}.`;
                setShouldAutoScroll(true);

                // Triggers pipeline visual
                setProcessingStep('generating');
                setTimeout(() => setProcessingStep('simulating'), 2000);
                setTimeout(() => setProcessingStep('interpreting'), 4000);
                setTimeout(() => setProcessingStep(null), 8000); // Reset after typical delay

                const timer = setTimeout(() => sendMessage(triggerMessage), 500);
                return () => clearTimeout(timer);
            }
        }
    }, [contextConfig, sendMessage, setShouldAutoScroll]);

    return (
        <div className="flex flex-col h-full w-full overflow-hidden">
            {/* Messages List */}
            <main
                ref={scrollContainerRef as any}
                onScroll={handleScroll}
                className={`overflow-y-auto bg-transparent min-w-0 w-full overflow-x-hidden transition-all duration-700 ease-in-out ${messages.length === 0 ? 'flex-[0.001] opacity-0 py-0' : 'flex-1 p-3 md:p-4 lg:p-6 opacity-100'}`}
            >
                <div className="w-full max-w-3xl mx-auto space-y-6">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex w-full ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`flex max-w-[95%] md:max-w-[85%] lg:max-w-[80%] ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'} items-end gap-2`}>
                                {/* Avatar */}
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${msg.sender === 'user'
                                    ? 'bg-secondary border border-border shadow-sm'
                                    : 'bg-primary border border-primary text-primary-foreground shadow-md'
                                    }`}>
                                    {msg.sender === 'user' ? <User size={14} className="text-foreground" /> : (
                                        <div className="w-full h-full overflow-hidden rounded-lg">
                                            <img
                                                src="/avatar.png"
                                                alt="QG"
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Bubble */}
                                <div className={`rounded-2xl px-5 py-4 shadow-sm text-base leading-relaxed whitespace-pre-wrap ${msg.sender === 'user'
                                    ? 'bg-secondary text-foreground border border-border rounded-br-none'
                                    : msg.sender === 'system'
                                        ? 'bg-muted text-muted-foreground text-sm text-center w-full rounded-lg border border-border'
                                        : 'bg-card text-card-foreground border border-border rounded-bl-none shadow-sm min-w-0 max-w-full overflow-hidden'
                                    }`}>
                                    {msg.sender === 'bot' || msg.sender === 'user' ? (
                                        <>
                                            <MarkdownRenderer content={msg.text} />
                                            {msg.chartData && <QuantumChart data={msg.chartData.data} />}
                                        </>
                                    ) : (
                                        <span className="flex items-center justify-center gap-2">
                                            <ShieldCheck size={14} />
                                            {msg.text}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}

                    {isTyping && (
                        <div className="flex w-full justify-start animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <div className="flex flex-row items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                                    <span className="text-[10px] font-bold text-primary">...</span>
                                </div>
                                <div className="flex space-x-1 pl-2">
                                    <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                    <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                    <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce"></div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Quantum Pipeline Visual */}
                    {processingStep && (
                        <div className="flex w-full justify-start animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <div className="bg-card border border-border rounded-2xl p-4 w-full max-w-md flex items-center gap-4 shadow-sm">
                                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                                    <div className="w-5 h-5 border-2 border-muted border-t-primary rounded-full animate-spin"></div>
                                </div>
                                <div className="flex-1">
                                    <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Quantum Pipeline Active</div>
                                    <div className="text-sm font-bold text-foreground">
                                        {processingStep === 'generating' ? 'Generating Pulse Code...' :
                                            processingStep === 'simulating' ? 'Running Circuit on Simulator...' :
                                                'Interpreting Quantum Output...'}
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    <div className={`w-1.5 h-1.5 rounded-full ${processingStep === 'generating' ? 'bg-primary' : 'bg-muted'}`}></div>
                                    <div className={`w-1.5 h-1.5 rounded-full ${processingStep === 'simulating' ? 'bg-primary' : 'bg-muted'}`}></div>
                                    <div className={`w-1.5 h-1.5 rounded-full ${processingStep === 'interpreting' ? 'bg-primary' : 'bg-muted'}`}></div>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </main>

            {/* Input Area */}
            <footer className={`p-4 md:p-6 bg-transparent relative z-20 transition-all duration-700 ease-in-out ${messages.length === 0 ? 'flex-1 flex flex-col justify-center' : 'translate-y-0'}`}>
                <div className="max-w-3xl mx-auto w-full relative group">
                    {messages.length === 0 && (
                        <div className="mb-12 text-center animate-in fade-in zoom-in slide-in-from-bottom-4 duration-1000">
                            <div className="mx-auto mb-8 group-hover:scale-105 transition-transform duration-500 flex justify-center">
                                <img src="/avatar.png" alt="Quantum Guru" className="h-24 w-auto object-contain" />
                            </div>
                            <p className="text-muted-foreground text-lg font-light max-w-lg mx-auto leading-relaxed">
                                Industrial Quantum Solutions & Architecture Design.
                            </p>
                        </div>
                    )}
                    <div className="relative flex items-end gap-2 bg-card/80 backdrop-blur-xl border border-border rounded-2xl shadow-lg p-2 transition-all focus-within:ring-1 focus-within:ring-ring focus-within:border-ring focus-within:bg-card">
                        <textarea
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                            placeholder={placeholder || "Ask QUANTUM GURU AI..."}
                            rows={1}
                            className="flex-1 max-h-32 bg-transparent text-foreground placeholder:text-muted-foreground text-base px-4 py-3 focus:outline-none resize-none scrollbar-hide"
                            style={{ minHeight: '52px' }}
                        />

                        <button
                            onClick={() => sendMessage()}
                            disabled={!inputValue.trim() || isTyping}
                            className="p-3 rounded-xl bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md active:scale-95 mb-0.5 font-bold"
                        >
                            {isTyping ? <StopCircle size={18} className="animate-pulse" /> : <Send size={18} fill="currentColor" />}
                        </button>
                    </div>
                </div>
            </footer>
        </div>
    );
}
