"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Send, User, StopCircle, ShieldCheck, TrendingUp, BookOpen } from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';
import { chatWithGroq, AIResponse } from '@/app/actions/chat';

interface Message {
    id: number;
    text: string;
    sender: 'user' | 'bot' | 'system';
    timestamp: string;
    isStreaming?: boolean;
}

interface ChatInterfaceProps {
    mode: 'industry' | 'market' | 'article';
    initialMessage?: string;
    contextConfig?: any; // The payload to send to chatWithGroq
    placeholder?: string;
}

export default function ChatInterface({ mode, initialMessage, contextConfig, placeholder }: ChatInterfaceProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [streamingMessageId, setStreamingMessageId] = useState<number | null>(null);

    // Initial Message
    useEffect(() => {
        if (messages.length === 0 && initialMessage) {
            setTimeout(() => {
                setMessages([{
                    id: 1,
                    text: initialMessage,
                    sender: 'bot',
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }]);
            }, 500);
        }
    }, [initialMessage]);

    // Auto-scroll
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);


    const handleSendMessage = async () => {
        if (!inputValue.trim()) return;

        const userMsg: Message = {
            id: Date.now(),
            text: inputValue,
            sender: 'user',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setMessages(prev => [...prev, userMsg]);
        setInputValue("");
        setIsTyping(true);

        try {
            // Include mode in context config if not present
            const fullConfig = { ...contextConfig, mode };

            const response = await chatWithGroq(userMsg.text, 'chat', 'en', fullConfig);

            // Simulate Streaming Effect
            const botMsgId = Date.now() + 1;
            setStreamingMessageId(botMsgId);

            setMessages(prev => [...prev, {
                id: botMsgId,
                text: "", // Start empty
                sender: 'bot',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                isStreaming: true
            }]);

            let currentText = "";
            const words = response.text.split(" ");

            // typing effect 
            for (let i = 0; i < words.length; i++) {
                currentText += words[i] + " ";
                setMessages(prev => prev.map(msg =>
                    msg.id === botMsgId ? { ...msg, text: currentText } : msg
                ));
                await new Promise(resolve => setTimeout(resolve, 20)); // Adjust speed here
            }

            setMessages(prev => prev.map(msg =>
                msg.id === botMsgId ? { ...msg, isStreaming: false } : msg
            ));
            setStreamingMessageId(null);

        } catch (error) {
            console.error("Chat Error:", error);
            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                text: "Error: Neural link unstable. Please retry transmission.",
                sender: 'bot',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    return (
        <React.Fragment>
            {/* Messages List - Transitions smoothy */}
            <main className={`overflow-y-auto bg-transparent min-w-0 w-full overflow-x-hidden transition-all duration-700 ease-in-out ${messages.length === 0 ? 'flex-[0.001] opacity-0 py-0' : 'flex-1 p-3 md:p-4 lg:p-6 opacity-100'}`}>
                <div className="w-full max-w-3xl mx-auto space-y-6">

                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex w-full ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`flex max-w-[95%] md:max-w-[85%] lg:max-w-[80%] ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'} items-end gap-2`}>

                                {/* Avatar */}
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${msg.sender === 'user'
                                    ? 'bg-zinc-800 border border-white/10 shadow-lg shadow-black/20'
                                    : 'bg-white/5 border border-white/10 shadow-lg shadow-white/5'
                                    }`}>
                                    {msg.sender === 'user' ? <User size={14} className="text-white" /> : (
                                        <span className="text-[10px] font-bold text-white dark:text-white text-zinc-800">QG</span>
                                    )}
                                </div>

                                {/* Bubble */}
                                <div className={`rounded-2xl px-5 py-4 shadow-sm text-base leading-relaxed whitespace-pre-wrap ${msg.sender === 'user'
                                    ? 'bg-zinc-800/80 backdrop-blur-md text-zinc-100 border border-white/10 rounded-br-none shadow-[0_4px_20px_rgba(0,0,0,0.2)]'
                                    : msg.sender === 'system'
                                        ? 'bg-secondary/50 text-muted-foreground text-sm text-center w-full rounded-lg border border-border'
                                        : 'bg-card/60 backdrop-blur-md text-card-foreground border border-border rounded-bl-none shadow-sm min-w-0 max-w-full overflow-hidden'
                                    }`}>
                                    {msg.sender === 'bot' || msg.sender === 'user' ? (
                                        <MarkdownRenderer content={msg.text} />
                                    ) : (
                                        <span className="flex items-center justify-center gap-2">
                                            {mode === 'market' ? <TrendingUp size={14} className="text-zinc-400" /> : mode === 'article' ? <BookOpen size={14} className="text-zinc-400" /> : <ShieldCheck size={14} className="text-zinc-400" />}
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
                                <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                                    <span className="text-[10px] font-bold text-white">...</span>
                                </div>
                                <div className="flex space-x-1 pl-2">
                                    <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                    <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                    <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce"></div>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </main>

            {/* Input Area - Integrated & Sleek */}
            <footer className="p-4 md:p-6 bg-transparent relative z-20">
                <div className="max-w-3xl mx-auto relative group">
                    <div className="relative flex items-end gap-2 bg-zinc-900/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-2 transition-all focus-within:ring-1 focus-within:ring-zinc-700/50 focus-within:border-zinc-700/50 focus-within:bg-zinc-900/95">
                        <textarea
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={placeholder || "Initialize quantum query..."}
                            rows={1}
                            className="flex-1 max-h-32 bg-transparent text-zinc-100 placeholder:text-zinc-500 text-base px-4 py-3 focus:outline-none resize-none scrollbar-hide"
                            style={{ minHeight: '52px' }}
                        />

                        <button
                            onClick={handleSendMessage}
                            disabled={!inputValue.trim() || isTyping}
                            className="p-3 rounded-xl bg-zinc-100 text-zinc-950 hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg active:scale-95 mb-0.5 font-bold"
                        >
                            {isTyping ? <StopCircle size={18} className="animate-pulse" /> : <Send size={18} fill="currentColor" />}
                        </button>
                    </div>
                    <p className="text-center text-[10px] text-zinc-600 mt-3 font-medium tracking-wide">
                        QUANTUM SECURE CONNECTION • END-TO-END ENCRYPTED
                    </p>
                </div>
            </footer>
        </React.Fragment>
    );
}
