"use client";

import React, { useRef, useEffect } from 'react';
import { Send, User, StopCircle, TrendingUp } from 'lucide-react';
import MarkdownRenderer from '../MarkdownRenderer';
import QuantumChart from '../QuantumChart';
import { useQuantumChat } from '@/hooks/useQuantumChat';

interface MarketChatProps {
    contextConfig?: any;
    placeholder?: string;
    onAnalysisTriggered?: () => void;
}

export default function MarketChat({ contextConfig, placeholder, onAnalysisTriggered }: MarketChatProps) {
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
    } = useQuantumChat('market', contextConfig);

    const lastTriggeredUrlRef = useRef<string | null>(null);
    const lastTriggeredNewsRef = useRef<string | null>(null);

    // --- Market Triggers ---
    // 1. Stock Analysis Trigger
    useEffect(() => {
        const targetUrl = contextConfig?.stockUrl;
        const targetName = contextConfig?.stockName;

        if (targetUrl) {
            if (targetUrl !== lastTriggeredUrlRef.current) {
                lastTriggeredUrlRef.current = targetUrl;
                const triggerMessage = `Analyze latest trends, market news, and stock prices for ${targetName}.`;

                setShouldAutoScroll(true);
                const timer = setTimeout(() => {
                    sendMessage(triggerMessage);
                    onAnalysisTriggered?.();
                }, 1000);
                return () => clearTimeout(timer);
            }
        } else {
            // Clear ref if targetUrl becomes null, allowing re-selection of the same stock
            lastTriggeredUrlRef.current = null;
        }
    }, [contextConfig?.stockUrl, contextConfig?.stockName, sendMessage, onAnalysisTriggered, setShouldAutoScroll]);

    // 2. News Detail Trigger
    useEffect(() => {
        const targetNewsTitle = contextConfig?.newsTitle;
        const targetNewsSource = contextConfig?.newsSource;

        if (targetNewsTitle) {
            if (targetNewsTitle !== lastTriggeredNewsRef.current) {
                lastTriggeredNewsRef.current = targetNewsTitle;
                const triggerMessage = `Provide more details and market implications for the following news headline from ${targetNewsSource}: "${targetNewsTitle}"`;

                setShouldAutoScroll(true);
                const timer = setTimeout(() => {
                    sendMessage(triggerMessage);
                    onAnalysisTriggered?.();
                }, 500);
                return () => clearTimeout(timer);
            }
        } else {
            // Clear ref if title becomes null
            lastTriggeredNewsRef.current = null;
        }
    }, [contextConfig?.newsTitle, contextConfig?.newsSource, sendMessage, onAnalysisTriggered, setShouldAutoScroll]);

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
                                    : 'bg-white border border-border shadow-sm p-1'
                                    }`}>
                                    {msg.sender === 'user' ? <User size={14} className="text-foreground" /> : (
                                        <div className="w-full h-full overflow-hidden rounded-lg">
                                            <img
                                                src="/qg-icon.png"
                                                alt="QG"
                                                className="w-full h-full object-contain"
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Bubble */}
                                <div className={`rounded-2xl px-5 py-4 shadow-sm text-base leading-relaxed whitespace-pre-wrap ${msg.sender === 'user'
                                    ? 'bg-secondary text-foreground border border-border rounded-br-none'
                                    : 'bg-card text-card-foreground border border-border rounded-bl-none shadow-sm min-w-0 max-w-full overflow-hidden'
                                    }`}>
                                    {msg.sender === 'bot' || msg.sender === 'user' ? (
                                        <>
                                            <MarkdownRenderer content={msg.text} hideLinks={true} />
                                            {msg.chartData && <QuantumChart data={msg.chartData.data} />}
                                        </>
                                    ) : (
                                        <span className="flex items-center justify-center gap-2">
                                            <TrendingUp size={14} />
                                            {msg.text}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}

                    {isTyping && (
                        <div className="flex w-full justify-start animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <div className="flex flex-row items-center gap-4">
                                <div className="w-8 h-8 rounded-lg bg-white shadow-sm border border-border p-1 flex items-center justify-center shrink-0">
                                    <img src="/qg-icon.png" className="w-full h-full object-contain" alt="QG typing" />
                                </div>
                                <div className="flex space-x-1 pl-2">
                                    <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                    <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                    <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce"></div>
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
                                <img src="/qg-icon.png" alt="Quantum Guru" className="h-[90px] w-auto object-contain" />
                            </div>
                            <p className="text-muted-foreground text-lg font-light max-w-lg mx-auto leading-relaxed">
                                Summarize and construct your thoughts for quantum
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
                            className="p-3 rounded-xl text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md active:scale-95 mb-1 font-bold"
                            style={{ backgroundColor: 'rgb(48, 102, 187)' }}
                        >
                            {isTyping ? <StopCircle size={18} className="animate-pulse" /> : <Send size={18} fill="currentColor" />}
                        </button>
                    </div>
                </div>
            </footer>
        </div>
    );
}
