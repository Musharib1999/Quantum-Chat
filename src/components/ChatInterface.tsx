"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Send, User, StopCircle, ShieldCheck, TrendingUp, BookOpen } from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';
import QuantumChart from './QuantumChart';
import { chatWithGroq, AIResponse } from '@/app/actions/chat';

interface Message {
    id: number;
    text: string;
    sender: 'user' | 'bot' | 'system';
    timestamp: string;
    isStreaming?: boolean;
    chartData?: any;
}

interface ChatInterfaceProps {
    mode: 'industry' | 'market' | 'article';
    contextConfig?: any; // The payload to send to chatWithGroq
    placeholder?: string;
}

export default function ChatInterface({ mode, contextConfig, placeholder }: ChatInterfaceProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [processingStep, setProcessingStep] = useState<'generating' | 'simulating' | 'interpreting' | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [streamingMessageId, setStreamingMessageId] = useState<number | null>(null);
    const lastTriggeredUrlRef = useRef<string | null>(null);

    // Auto-scroll
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    const lastTriggeredFormRef = useRef<string | null>(null);

    // --- Automated Analysis Trigger ---
    useEffect(() => {
        const targetUrl = mode === 'market' ? contextConfig?.stockUrl : mode === 'article' ? contextConfig?.articleUrl : null;
        const targetName = mode === 'market' ? contextConfig?.stockName : mode === 'article' ? contextConfig?.articleTitle : null;

        if (targetUrl && targetUrl !== lastTriggeredUrlRef.current) {
            lastTriggeredUrlRef.current = targetUrl;

            // Check if we should trigger (new selection or starting fresh)
            const triggerMessage = mode === 'market'
                ? `Analyze latest trends, market news, and stock prices for ${targetName}.`
                : `Provide a detailed summary and latest insights for the research article: ${targetName}.`;

            // Artificial delay to feel "real"
            const timer = setTimeout(() => {
                handleSendMessage(triggerMessage);
            }, 1000);
            return () => clearTimeout(timer);
        }

        // --- SPECIAL: INDUSTRY WORKFLOW TRIGGER ---
        if (mode === 'industry' && contextConfig?.formData) {
            const formString = JSON.stringify(contextConfig.formData);
            if (formString !== lastTriggeredFormRef.current) {
                lastTriggeredFormRef.current = formString;
                const triggerMessage = `Execute Quantum Workflow for ${contextConfig.problem} in ${contextConfig.industry} using ${contextConfig.hardware}.`;
                const timer = setTimeout(() => handleSendMessage(triggerMessage), 500);
                return () => clearTimeout(timer);
            }
        }
    }, [contextConfig?.stockUrl, contextConfig?.articleUrl, contextConfig?.formData, mode]);


    const handleSendMessage = async (text?: string, customConfig?: any) => {
        const messageToSend = text || inputValue;
        if (!messageToSend.trim()) return;

        const userMsg: Message = {
            id: Date.now(),
            text: messageToSend,
            sender: 'user',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setMessages(prev => [...prev, userMsg]);
        setInputValue("");
        setIsTyping(true);

        // --- Step-based visibility for Industry Workflow ---
        if (mode === 'industry' && (customConfig?.formData || contextConfig?.formData)) {
            setProcessingStep('generating');
        }

        try {
            // Include mode in context config if not present
            const fullConfig = { ...contextConfig, ...customConfig, mode };

            // Simulate Pipeline progress if form is active
            if (fullConfig.formData) {
                setTimeout(() => setProcessingStep('simulating'), 2000);
                setTimeout(() => setProcessingStep('interpreting'), 4000);
            }

            const response = await chatWithGroq(userMsg.text, 'chat', 'en', fullConfig);
            setProcessingStep(null);

            // Parse Chart Data if present
            let chartData = null;
            let cleanText = response.text;
            const chartMatch = response.text.match(/\[CHART_DATA\]([\s\S]*?)\[\/CHART_DATA\]/);
            if (chartMatch) {
                try {
                    chartData = JSON.parse(chartMatch[1]);
                    cleanText = response.text.replace(/\[CHART_DATA\][\s\S]*?\[\/CHART_DATA\]/, '').trim();
                } catch (e) {
                    console.error("Failed to parse chart data");
                }
            }

            // Simulate Streaming Effect
            const botMsgId = Date.now() + 1;
            setStreamingMessageId(botMsgId);

            setMessages(prev => [...prev, {
                id: botMsgId,
                text: "", // Start empty
                sender: 'bot',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                isStreaming: true,
                chartData
            }]);

            let currentText = "";
            const words = cleanText.split(" ");

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
            setProcessingStep(null);
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
        <div className="flex flex-col h-full w-full overflow-hidden">
            {/* Messages List - Transitions smoothy */}
            <main className={`overflow-y-auto bg-transparent min-w-0 w-full overflow-x-hidden transition-all duration-700 ease-in-out ${messages.length === 0 ? 'flex-[0.001] opacity-0 py-0' : 'flex-1 p-3 md:p-4 lg:p-6 opacity-100'}`}>
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
                                            <MarkdownRenderer content={msg.text} hideLinks={mode === 'market'} />
                                            {msg.chartData && <QuantumChart data={msg.chartData.data} />}
                                        </>
                                    ) : (
                                        <span className="flex items-center justify-center gap-2">
                                            {mode === 'market' ? <TrendingUp size={14} /> : mode === 'article' ? <BookOpen size={14} /> : <ShieldCheck size={14} />}
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

            {/* Input Area - Integrated & Sleek */}
            <footer className={`p-4 md:p-6 bg-transparent relative z-20 transition-all duration-700 ease-in-out ${messages.length === 0 ? 'flex-1 flex flex-col justify-center' : 'translate-y-0'}`}>
                <div className="max-w-3xl mx-auto w-full relative group">
                    {messages.length === 0 && (
                        <div className="mb-12 text-center animate-in fade-in zoom-in slide-in-from-bottom-4 duration-1000">
                            <div className="mx-auto mb-8 group-hover:scale-105 transition-transform duration-500 flex justify-center">
                                <img src="/avatar.png" alt="Quantum Guru" className="h-24 w-auto object-contain" />
                            </div>
                            <p className="text-muted-foreground text-lg font-light max-w-lg mx-auto leading-relaxed">
                                {mode === 'market' ? 'Advanced Market Intelligence & Financial Neural Analysis.' :
                                    mode === 'article' ? 'Quantum Research Lab & Document Intelligence.' :
                                        'Industrial Quantum Solutions & Architecture Design.'}
                            </p>
                        </div>
                    )}
                    <div className="relative flex items-end gap-2 bg-card/80 backdrop-blur-xl border border-border rounded-2xl shadow-lg p-2 transition-all focus-within:ring-1 focus-within:ring-ring focus-within:border-ring focus-within:bg-card">
                        <textarea
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                            placeholder={placeholder || "Initialize quantum query..."}
                            rows={1}
                            className="flex-1 max-h-32 bg-transparent text-foreground placeholder:text-muted-foreground text-base px-4 py-3 focus:outline-none resize-none scrollbar-hide"
                            style={{ minHeight: '52px' }}
                        />

                        <button
                            onClick={() => handleSendMessage()}
                            disabled={!inputValue.trim() || isTyping}
                            className="p-3 rounded-xl bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md active:scale-95 mb-0.5 font-bold"
                        >
                            {isTyping ? <StopCircle size={18} className="animate-pulse" /> : <Send size={18} fill="currentColor" />}
                        </button>
                    </div>
                    <p className="text-center text-[10px] text-muted-foreground mt-3 font-medium tracking-wide">
                        QUANTUM SECURE CONNECTION • END-TO-END ENCRYPTED
                    </p>
                </div>
            </footer>
        </div>
    );
}
