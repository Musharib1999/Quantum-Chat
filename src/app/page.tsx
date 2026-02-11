"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Settings, Send, User, ChevronLeft, StopCircle, RefreshCw, Key, ShieldCheck, Database, Loader2, TrendingUp, BookOpen } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';

import QuantumBackground from '@/components/QuantumBackground';
import SidebarWizard from '@/components/SidebarWizard';
import { chatWithGroq } from './actions/chat';
import ThemeToggle from '@/components/ThemeToggle';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import { getChatLogs } from './actions/admin';
import ModeSwitcher from '@/components/ModeSwitcher';
import StockSidebar from '@/components/StockSidebar';
import ArticleSidebar from '@/components/ArticleSidebar';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'bot' | 'system';
  timestamp: string;
  isStreaming?: boolean;
}

export default function Home() {
  const [sessionConfig, setSessionConfig] = useState<{ industry: string | null, service: string | null, problem: string | null, hardware: string | null }>({ industry: 'Biochemistry', service: null, problem: null, hardware: null });
  const [sidebarStep, setSidebarStep] = useState<'industry' | 'service' | 'problem' | 'hardware' | 'ready'>('service');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [streamingMessageId, setStreamingMessageId] = useState<number | null>(null);

  // --- Multi-Interface State ---
  const [currentMode, setCurrentMode] = useState<'industry' | 'market' | 'article'>('industry');
  const [selectedStock, setSelectedStock] = useState<{ _id: string, name: string, url: string } | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<{ _id: string, title: string, category: string, url: string } | null>(null);


  // Initial System Message
  useEffect(() => {
    // Only set initial message if empty
    if (messages.length === 0) {
      setTimeout(() => {
        setMessages([{
          id: 1,
          text: "Quantum Interface Initialized. Systems Online.\n\nPlease complete the configuration sequence in the sidebar to begin your session.",
          sender: 'bot',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
      }, 1000);
    }
  }, []); // Run once on mount

  // Auto-scroll
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);


  // --- Session Wizard Handlers ---
  const handleWizardSelection = (type: 'industry' | 'service' | 'problem' | 'hardware', value: string) => {
    setSessionConfig(prev => {
      // Smart Reset Logic: Changing upstream selection clears downstream options
      const newConfig = { ...prev, [type]: value };

      if (type === 'service') {
        newConfig.problem = null;
        newConfig.hardware = null;
      }
      if (type === 'problem') {
        newConfig.hardware = null;
      }

      return newConfig;
    });

    // Advance Step (Auto-open next section if not already set, but don't force close)
    if (type === 'industry') setSidebarStep('service');
    if (type === 'service') setSidebarStep('problem');
    if (type === 'problem') setSidebarStep('hardware');
    if (type === 'hardware') setSidebarStep('ready');
  };

  // --- Mode Handling ---
  const handleModeSwitch = (mode: 'industry' | 'market' | 'article') => {
    setCurrentMode(mode);
    setIsSidebarOpen(true);

    // Optional: Add a system message when switching modes
    const modeName = mode === 'industry' ? 'Quantum Industry' : mode === 'market' ? 'Market Intelligence' : 'Research Lab';
    setMessages(prev => [...prev, {
      id: Date.now(),
      text: `Switched Mode to: **${modeName}**`,
      sender: 'system',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);
  };

  const handleStockSelect = (stock: any) => {
    setSelectedStock(stock);
    setMessages(prev => [...prev, {
      id: Date.now(),
      text: `Asset Selected: **${stock.name}**\nAnalysis Context Loaded.`,
      sender: 'system',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);
  };

  const handleArticleSelect = (article: any) => {
    setSelectedArticle(article);
    setMessages(prev => [...prev, {
      id: Date.now(),
      text: `Research Loaded: **${article.title}**\nCategory: ${article.category}`,
      sender: 'system',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);
  };


  // --- Chat Logic ---
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
      // Build Context based on Mode
      let contextConfig: any = {};

      if (currentMode === 'industry') {
        contextConfig = sessionConfig;
      } else if (currentMode === 'market' && selectedStock) {
        contextConfig = {
          mode: 'market',
          stockName: selectedStock.name,
          stockUrl: selectedStock.url
        };
      } else if (currentMode === 'article' && selectedArticle) {
        contextConfig = {
          mode: 'article',
          articleTitle: selectedArticle.title,
          articleCategory: selectedArticle.category,
          articleUrl: selectedArticle.url
        };
      }

      const response = await chatWithGroq(userMsg.text, 'chat', 'en', contextConfig);

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
    <div className="flex h-screen bg-background font-sans overflow-hidden text-foreground relative selection:bg-purple-500/30">

      {/* Background Effects */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-20 dark:opacity-100 transition-opacity duration-500">
        <QuantumBackground />
      </div>
      <div className="fixed inset-0 bg-background/80 z-0 pointer-events-none backdrop-blur-[1px]"></div>

      {/* --- Mode Switcher (Far Left) --- */}
      <div className="relative z-20 h-full flex-shrink-0">
        <ModeSwitcher currentMode={currentMode} onSwitch={handleModeSwitch} />
      </div>

      {/* --- Left Sidebar (Dynamic) --- */}
      <div className={`
        relative z-10 bg-black/20 backdrop-blur-2xl border-r border-white/5 flex flex-col transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]
        ${isSidebarOpen ? 'w-80 translate-x-0 opacity-100' : 'w-0 -translate-x-10 opacity-0 overflow-hidden'}
      `}>
        {/* Toggle Button */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-12 bg-border/50 hover:bg-purple-500 hover:text-white rounded-r-xl flex items-center justify-center transition-all z-50 backdrop-blur-md border border-l-0 border-white/10 shadow-lg"
          aria-label={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          <ChevronLeft size={14} className={`transition-transform duration-500 ${!isSidebarOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dynamic Sidebar Content */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden">
          {currentMode === 'industry' && (
            <div className="p-4 space-y-2">
              <SidebarWizard step={sidebarStep} config={sessionConfig} onSelect={handleWizardSelection} />
            </div>
          )}
          {currentMode === 'market' && (
            <div className="h-full">
              <StockSidebar onSelect={handleStockSelect} activeStockId={selectedStock?._id} />
            </div>
          )}
          {currentMode === 'article' && (
            <div className="h-full">
              <ArticleSidebar onSelect={handleArticleSelect} activeArticleId={selectedArticle?._id} />
            </div>
          )}
        </nav>

        <div className="p-4 border-t border-border bg-card/20 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Appearance</span>
            <ThemeToggle />
          </div>
        </div>
      </div>

      {/* --- Main Chat Area --- */}
      <div className="flex-1 flex flex-col h-full relative min-w-0 w-full overflow-hidden z-10 bg-transparent">

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
                        {currentMode === 'market' ? <TrendingUp size={14} /> : currentMode === 'article' ? <BookOpen size={14} /> : <ShieldCheck size={14} />}
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
            {/* Glow Effect */}
            <div className={`absolute -inset-0.5 bg-gradient-to-r from-purple-500/20 via-blue-500/20 to-purple-500/20 rounded-2xl opacity-0 group-hover:opacity-100 transition duration-1000 blur-md ${isTyping ? 'opacity-50 animate-pulse' : ''}`}></div>

            <div className="relative flex items-end gap-2 bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-2 transition-all focus-within:ring-1 focus-within:ring-white/20 focus-within:border-white/20 focus-within:bg-zinc-900/95">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Ask Quantum Assistant (${currentMode === 'industry' ? 'Industry Mode' : currentMode === 'market' ? 'Market Intelligence' : 'Research Lab'})...`}
                rows={1}
                className="flex-1 max-h-32 bg-transparent text-zinc-100 placeholder:text-zinc-500 text-base px-4 py-3 focus:outline-none resize-none scrollbar-hide"
                style={{ minHeight: '52px' }}
              />

              <button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isTyping}
                className="p-3 rounded-xl bg-white text-black hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-white/20 hover:scale-105 active:scale-95 mb-0.5"
              >
                {isTyping ? <StopCircle size={18} className="animate-pulse" /> : <Send size={18} fill="currentColor" />}
              </button>
            </div>
            <p className="text-center text-[10px] text-zinc-600 mt-3 font-medium tracking-wide">
              QUANTUM SECURE CONNECTION • END-TO-END ENCRYPTED
            </p>
          </div>
        </footer>

      </div>
    </div>
  );
}
