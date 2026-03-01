"use client";

import React, { useState } from 'react';
import { Bot, User, StopCircle, Send } from 'lucide-react';
import MarkdownRenderer from '../MarkdownRenderer';
import { useQuantumChat } from '@/hooks/useQuantumChat';

interface AssistantChatProps {
    placeholder?: string;
}

export default function AssistantChat({ placeholder }: AssistantChatProps) {
    const {
        messages,
        inputValue,
        setInputValue,
        isTyping,
        sendMessage,
        messagesEndRef,
        scrollContainerRef,
        handleScroll
    } = useQuantumChat('assistant');

    return (
        <div className="flex flex-col h-full w-full overflow-hidden relative">

            {/* Messages List */}
            <main
                ref={scrollContainerRef as any}
                onScroll={handleScroll}
                className={`overflow-y-auto bg-transparent min-w-0 w-full overflow-x-hidden transition-all duration-700 ease-in-out pb-32 ${messages.length === 0 ? 'flex-[0.001] opacity-0 py-0' : 'flex-1 p-4 md:p-8 lg:p-10 opacity-100'}`}
            >
                <div className="w-full max-w-4xl mx-auto space-y-8">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex w-full ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`flex max-w-[95%] md:max-w-[85%] lg:max-w-[80%] ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'} items-start gap-4`}>
                                {/* Avatar */}
                                <div className={`w-10 h-10 mt-1 rounded-xl flex items-center justify-center shrink-0 ${msg.sender === 'user'
                                    ? 'bg-secondary border border-border shadow-sm'
                                    : 'bg-white border border-border shadow-sm p-1'
                                    }`}>
                                    {msg.sender === 'user' ? <User size={18} className="text-foreground" /> : (
                                        <div className="w-full h-full overflow-hidden rounded-xl">
                                            <img
                                                src="/qg-icon.png"
                                                alt="QG"
                                                className="w-full h-full object-contain"
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Bubble */}
                                <div className={`rounded-3xl px-6 py-5 shadow-sm text-base leading-relaxed whitespace-pre-wrap ${msg.sender === 'user'
                                    ? 'bg-secondary text-foreground border border-border rounded-tr-sm'
                                    : 'bg-card text-card-foreground border border-border rounded-tl-sm shadow-sm min-w-0 max-w-full overflow-hidden'
                                    }`}>
                                    <MarkdownRenderer content={msg.text} />
                                </div>
                            </div>
                        </div>
                    ))}

                    {isTyping && (
                        <div className="flex w-full justify-start animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <div className="flex flex-row items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-white border border-border flex items-center justify-center shrink-0 p-1 shadow-sm">
                                    <img src="/qg-icon.png" className="w-full h-full object-contain" alt="QG typing" />
                                </div>
                                <div className="flex space-x-1 pl-4 py-5">
                                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </main>

            {/* Input Area + Initial State */}
            <div className={`absolute bottom-0 left-0 right-0 p-4 md:p-8 shrink-0 bg-transparent z-20 transition-all duration-700 ease-in-out ${messages.length === 0 ? 'top-1/2 -translate-y-1/2' : 'translate-y-0'}`}>
                <div className="max-w-4xl mx-auto w-full relative group">
                    {/* Initial State Header */}
                    {messages.length === 0 && (
                        <div className="mb-12 text-center animate-in fade-in zoom-in slide-in-from-bottom-4 duration-1000">
                            <div className="mx-auto mb-8 group-hover:scale-105 transition-transform duration-500 flex justify-center">
                                <img src="/qg-icon.png" alt="Quantum Guru" className="h-[90px] w-auto object-contain" />
                            </div>
                            <h2 className="text-3xl font-bold tracking-tight mb-4 text-foreground hidden">
                                Quantum Assistant
                            </h2>
                            <p className="text-muted-foreground text-lg font-light max-w-2xl mx-auto leading-relaxed">
                                Summarize and construct your thoughts for quantum
                            </p>
                        </div>
                    )}

                    {/* Input Field */}
                    <div className="relative flex items-end gap-2 bg-card/80 backdrop-blur-xl border border-border rounded-2xl shadow-lg p-2 transition-all focus-within:ring-1 focus-within:ring-ring focus-within:border-ring focus-within:bg-card">
                        <textarea
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                            placeholder={placeholder || "Ask Quantum Assistant..."}
                            rows={1}
                            className="flex-1 max-h-32 bg-transparent text-foreground placeholder:text-muted-foreground text-base px-4 py-3 focus:outline-none resize-none scrollbar-hide"
                            style={{ minHeight: '52px' }}
                        />
                        <button
                            onClick={() => sendMessage()}
                            disabled={!inputValue.trim() || isTyping}
                            className="p-3 rounded-xl text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md active:scale-95 mb-1 font-bold flex items-center justify-center"
                            style={{ backgroundColor: 'rgb(48, 102, 187)' }}
                        >
                            {isTyping ? <StopCircle size={18} className="animate-pulse" /> : <Send size={18} fill="currentColor" />}
                        </button>
                    </div>


                </div>
            </div>
        </div>
    );
}
