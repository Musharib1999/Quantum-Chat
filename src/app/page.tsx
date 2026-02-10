"use client";

import React, { useState, useRef, useEffect } from 'react';
import { chatWithGroq, checkGeminiConnection } from './actions/chat';
import { getQaPairs } from './actions/admin';
import { Send, Mic, Menu, X, FileText, MapPin, HelpCircle, Phone, Globe, ChevronRight, User, Share2, Download, Sparkles, Loader2, AlertTriangle, TrendingUp, ArrowUp } from 'lucide-react';
import QuantumBackground from '../components/QuantumBackground';

// --- Assets & Constants ---
// --- Assets & Constants ---
const GOV_LOGO_URL = "/logo.png?v=7";

const SUGGESTIONS = [
  "Check Application Status",
  "Mukhyamantri Nischay Yojna",
  "Jan Shikayat",
  "Quantum Computing Status",
];

const HINDI_SUGGESTIONS = [
  "आवेदन स्थिति देखें",
  "मुख्यमंत्री निश्चय योजना",
  "जन शिकायत",
  "PRI सदस्य विवरण"
];

const SmartForm = ({ config }: { config: any }) => {
  const [formData, setFormData] = React.useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = React.useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
  };

  if (isSubmitted) {
    return (
      <div className="mt-3 bg-green-50 border border-green-200 rounded-2xl p-6 text-center shadow-inner">
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <Sparkles className="text-green-600" size={24} />
        </div>
        <h4 className="text-green-800 font-bold mb-1">Application Submitted!</h4>
        <p className="text-[11px] text-green-600">Your request has been received. Reference ID: QG-{Math.floor(Math.random() * 89999 + 10000)}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 bg-white rounded-2xl p-4 border border-gray-200 shadow-sm w-full space-y-3">
      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-100 text-blue-700">
        <FileText size={18} />
        <span className="font-bold text-sm">{config.title || "Official Form"}</span>
      </div>

      {config.fields?.map((field: any, idx: number) => (
        <div key={idx} className="space-y-1">
          <label className="text-xs text-gray-500 font-medium pl-1">{field.label}</label>
          {field.type === 'select' ? (
            <select
              required
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
              onChange={e => setFormData(prev => ({ ...prev, [field.label]: e.target.value }))}
            >
              <option value="">Select Option</option>
              {field.options?.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          ) : (
            <input
              required
              type={field.type || 'text'}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              placeholder={`Enter ${field.label}...`}
              onChange={e => setFormData(prev => ({ ...prev, [field.label]: e.target.value }))}
            />
          )}
        </div>
      ))}

      <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl text-xs font-bold hover:bg-blue-700 transition-all shadow-md active:scale-[0.98] mt-2">
        Submit Request
      </button>
    </form>
  );
};

// --- Mock Backend Responses for "Database" Lookups ---
const MOCK_DB_RESPONSES: Record<string, { type: string, data: any }> = {
  mutation: {
    type: 'status_card',
    data: {
      caseNo: "2024/25/00142",
      applicant: "Rajesh Kumar Singh",
      circle: "Patna Sadar",
      status: "Under Review (CO Level)",
      date: "02 Feb 2026",
      step: 3
    }
  },
  details: {
    type: 'record_card',
    data: {
      ryot: "Suresh Prasad Yadav",
      khata: "124",
      khesra: "442",
      area: "12 Dismil",
      type: "Rayati"
    }
  }
};

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'bot' | 'system';
  timestamp: string;
  type?: string;
  data?: any;
  sourceUrl?: string; // NEW
  form?: any;       // NEW
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [lang, setLang] = useState<'en' | 'hi'>('en'); // 'en' or 'hi'
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [dynamicForms, setDynamicForms] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getQaPairs().then(pairs => {
      const forms = pairs.filter((p: any) => p.type === 'form');
      setDynamicForms(forms);
    });
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const [isConnected, setIsConnected] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    checkGeminiConnection().then(setIsConnected);
  }, []);

  // --- GEMINI API INTEGRATION (Server Action) ---
  const callGemini = async (prompt: string, type: 'chat' | 'draft' = 'chat') => {
    const response = await chatWithGroq(prompt, type, lang);
    return response;
  };

  const handleSend = async (mode: 'chat' | 'draft' = 'chat') => {
    if (!inputText.trim()) return;

    const newMsg: Message = {
      id: messages.length + 1,
      text: inputText,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, newMsg]);
    setInputText("");
    setIsLoading(true);

    // --- Hybrid Logic: Rule-Based for "Database" vs LLM for Chat ---

    // 1. Check for "Database" Keywords (Simulation)
    const lowerInput = inputText.toLowerCase();
    let dbMatch: string | null = null;

    // Only do DB lookup if NOT in draft mode
    if (mode === 'chat') {
      if (lowerInput.includes('mutation') && (lowerInput.includes('status') || lowerInput.includes('check'))) {
        dbMatch = 'mutation';
      } else if ((lowerInput.includes('khata') || lowerInput.includes('khesra')) && lowerInput.includes('124')) {
        dbMatch = 'details';
      }
    }

    if (dbMatch) {
      // Simulate network delay for DB lookup
      setTimeout(() => {
        const botResponse: Message = {
          id: messages.length + 2,
          text: lang === 'en' ? "Here are the details found in our records:" : "हमारे रिकॉर्ड में निम्नलिखित विवरण मिले:",
          sender: 'bot',
          type: MOCK_DB_RESPONSES[dbMatch!].type,
          data: MOCK_DB_RESPONSES[dbMatch!].data,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, botResponse]);
        setIsLoading(false);
      }, 1000);
      return;
    }

    // 2. Fallback to Gemini LLM for General Queries or Drafting
    const llmResponse = await callGemini(inputText, mode);



    if (llmResponse.error) {
      setConnectionError(llmResponse.error);
      setIsConnected(false);
    } else {
      setConnectionError(null);
      setIsConnected(true);
    }

    const botResponse: Message = {
      id: messages.length + 2,
      text: llmResponse.error ? (lang === 'hi' ? "क्षमा करें, अभी सेवा उपलब्ध नहीं है।" : "System Offline. Please check connection.") : llmResponse.text,
      sender: 'bot',
      type: llmResponse.source || 'text',
      sourceUrl: llmResponse.sourceUrl,
      form: llmResponse.form,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, botResponse]);
    setIsLoading(false);
  };

  const handleSidebarFormClick = (form: any) => {
    // 1. Add user message
    const userMsg: Message = {
      id: Date.now(),
      text: `I want to fill the ${form.question} form`,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    // 2. Add bot message with the form
    const botMsg: Message = {
      id: Date.now() + 1,
      text: form.answer,
      sender: 'bot',
      type: 'kb_form',
      form: form.formConfig,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg, botMsg]);
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const toggleLang = () => {
    const newLang = lang === 'en' ? 'hi' : 'en';
    setLang(newLang);
    setMessages(prev => [...prev, {
      id: Date.now(),
      text: newLang === 'hi' ? "भाषा हिंदी में बदल दी गई है।" : "Language switched to English.",
      sender: 'system',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);
  };

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden font-sans selection:bg-white/20 relative">
      <QuantumBackground />
      {/* --- Sidebar (Desktop & Mobile) --- */}
      {/* Connection Warning Banner */}
      {/* Connection Warning Banner */}
      {(!isConnected || connectionError) && (
        <div className="fixed top-0 left-0 right-0 bg-red-500/90 backdrop-blur-md text-white text-[10px] md:text-xs font-bold px-4 py-3 text-center z-[60] flex items-center justify-center gap-2 shadow-lg animate-in slide-in-from-top-full duration-500">
          <AlertTriangle size={14} className="shrink-0 animate-pulse" />
          <span className="uppercase tracking-wide">{connectionError || "System Warning: Database or AI Model Unreachable"}</span>
        </div>
      )}

      {/* Mobile Menu Trigger (Floating) */}
      <button
        onClick={() => setIsSidebarOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-zinc-900/50 backdrop-blur-md border border-white/10 rounded-lg text-white shadow-lg active:scale-95 transition-all"
      >
        <Menu size={20} />
      </button>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* --- Sidebar (Mobile Responsive) --- */}
      <div className={`fixed inset-y-0 left-0 z-50 w-72 bg-card border-r border-border transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:static flex flex-col shadow-2xl md:shadow-none`}>
        <div className="p-4 md:p-6 pb-[25px] border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center justify-center w-full py-4">
            <h1 className="font-bold text-xl md:text-2xl tracking-wide text-gradient py-2 text-center leading-tight">
              Quantum Guru
            </h1>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-gray-500 hover:bg-gray-100 p-2 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-2">

          <div className="mt-6 text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-2">Services</div>

          <SidebarGroup
            icon={<FileText size={18} />}
            label={lang === 'en' ? "SDKs & Frameworks" : "SDK और फ्रेमवर्क"}
            items={[
              { label: "QISKIT (IBM Quantum)", onClick: () => { } },
              { label: "CIRQ (Google Quantum)", onClick: () => { } }
            ]}
          />

          <SidebarGroup
            icon={<MapPin size={18} />}
            label={lang === 'en' ? "Optimization" : "इष्टतमीकरण"}
            items={[
              { label: "QUBO Models" },
              { label: "Graph Partitioning" },
              { label: "Portfolio Optimization" }
            ]}
          />

          <div className="mt-8 text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-2">Hardware</div>
          <SidebarItem icon={<Sparkles size={18} />} label="D-WAVE System" />
          <SidebarItem icon={<User size={18} />} label="Quantum Annealer" />

          <div className="mt-8 text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-2">Market Intelligence</div>
          <SidebarItem icon={<TrendingUp size={18} />} label="IONQ (IonQ Inc.)" />
          <SidebarItem icon={<TrendingUp size={18} />} label="QBTS (D-Wave)" />
          <SidebarItem icon={<TrendingUp size={18} />} label="RGTI (Rigetti)" />


        </nav>

        <div className="p-4 border-t border-border bg-card/20">
          <div className="flex items-center justify-between bg-secondary/50 p-3 rounded-lg border border-border">
            <div className="flex flex-col">
              <span className="text-xs text-secondary-foreground font-medium">Quantum Initiative</span>
              <span className="text-[10px] text-muted-foreground">Active until 2077</span>
            </div>
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
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
                      <span className="text-[10px] font-bold text-white">QG</span>
                    )}
                  </div>

                  {/* Bubble */}
                  <div className={`rounded-2xl px-5 py-4 shadow-sm text-base leading-relaxed whitespace-pre-wrap ${msg.sender === 'user'
                    ? 'bg-zinc-800/80 backdrop-blur-md text-zinc-100 border border-white/10 rounded-br-none shadow-[0_4px_20px_rgba(0,0,0,0.2)]'
                    : msg.sender === 'system'
                      ? 'bg-zinc-900/50 text-zinc-400 text-sm text-center w-full rounded-lg border border-white/5'
                      : 'bg-white/5 backdrop-blur-md text-zinc-200 border border-white/10 rounded-bl-none shadow-sm'
                    }`}>
                    {msg.text}

                    {/* Rich UI Components based on message type */}
                    {msg.type === 'status_card' && (
                      <div className="mt-3 bg-gray-50 rounded-xl p-4 border border-gray-200 w-full min-w-[280px]">
                        <div className="flex justify-between items-start mb-2 pb-2 border-b border-gray-200">
                          <div>
                            <span className="text-xs text-gray-500 uppercase font-semibold">Case No</span>
                            <div className="font-mono text-blue-700 font-medium">{msg.data.caseNo}</div>
                          </div>
                          <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded font-medium">{msg.data.status}</span>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Applicant:</span>
                            <span className="font-medium">{msg.data.applicant}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Circle:</span>
                            <span className="font-medium">{msg.data.circle}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Last Update:</span>
                            <span className="font-medium">{msg.data.date}</span>
                          </div>
                        </div>

                        {/* Status Stepper */}
                        <div className="mt-4 flex items-center justify-between text-[10px] text-gray-400">
                          <div className="flex flex-col items-center gap-1">
                            <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white">✓</div>
                            <span>Apply</span>
                          </div>
                          <div className="h-0.5 flex-1 bg-green-500 mx-1"></div>
                          <div className="flex flex-col items-center gap-1">
                            <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white">✓</div>
                            <span>Verify</span>
                          </div>
                          <div className="h-0.5 flex-1 bg-gray-300 mx-1"></div>
                          <div className="flex flex-col items-center gap-1">
                            <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">3</div>
                            <span>CO</span>
                          </div>
                        </div>

                        <button className="w-full mt-4 bg-white border border-blue-600 text-blue-600 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-50 transition-colors">
                          View Full Details
                        </button>
                      </div>
                    )}

                    {msg.type === 'record_card' && (
                      <div className="mt-3 bg-gradient-to-br from-green-50 to-white rounded-xl p-0 border border-green-100 overflow-hidden w-full">
                        <div className="bg-green-600 px-4 py-2 text-white text-xs font-bold uppercase tracking-wider flex justify-between items-center">
                          <span>Jamabandi Record</span>
                          <Share2 size={12} />
                        </div>
                        <div className="p-4 grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-gray-500 text-xs">Ryot Name</p>
                            <p className="font-medium text-gray-800">{msg.data.ryot}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 text-xs">Land Type</p>
                            <p className="font-medium text-gray-800">{msg.data.type}</p>
                          </div>
                          <div className="bg-white p-2 rounded border border-gray-100">
                            <p className="text-gray-500 text-xs">Khata No</p>
                            <p className="font-mono font-bold text-lg text-green-700">{msg.data.khata}</p>
                          </div>
                          <div className="bg-white p-2 rounded border border-gray-100">
                            <p className="text-gray-500 text-xs">Khesra No</p>
                            <p className="font-mono font-bold text-lg text-green-700">{msg.data.khesra}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* NEW: URL/Link Card */}
                    {(msg.sourceUrl || msg.type === 'kb_url') && (
                      <div className="mt-2 pt-2 border-t border-gray-100">
                        <a
                          href={msg.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors bg-blue-50/50 p-2 rounded-lg group"
                        >
                          <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center group-hover:scale-105 transition-transform">
                            <Globe size={12} />
                          </div>
                          <span className="text-xs font-medium truncate flex-1">{msg.sourceUrl}</span>
                          <ChevronRight size={14} className="opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                        </a>
                      </div>
                    )}

                    {/* NEW: Smart Form Box */}
                    {msg.type === 'form' && <SmartForm config={msg.data} />}

                    {/* Timestamp */}
                    <div className={`text-[10px] mt-1 ${msg.sender === 'user' ? 'text-zinc-500 text-right' : 'text-zinc-600'}`}>
                      {msg.timestamp}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-card border border-border text-foreground px-4 py-3 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce delay-150"></div>
                    <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce delay-300"></div>
                  </div>
                  <span className="text-xs text-zinc-500 uppercase font-medium tracking-wide">Processing</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </main>



        {/* --- Input Area Container --- */}
        <div className={`transition-all duration-700 ease-in-out flex flex-col items-center w-full px-4 z-20 ${messages.length === 0
          ? 'flex-1 justify-center'
          : 'flex-none justify-end pb-6 pt-4'
          }`}>

          {/* Initial Greeting - Only visible when no messages */}
          <div className={`transition-all duration-500 text-center space-y-2 mb-8 ${messages.length === 0 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10 hidden'
            }`}>
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-6 backdrop-blur-md shadow-[0_0_30px_rgba(255,255,255,0.05)] border border-white/5">
              <span className="text-2xl font-bold text-white">QG</span>
            </div>
            <p className="text-lg md:text-xl text-zinc-400 font-light max-w-md mx-auto leading-relaxed">
              System Online. I am <span className="text-white font-medium">Quantum Guru AI</span>, your intelligence interface.
              How can I assist with your computations today?
            </p>
          </div>

          <div className="w-full max-w-3xl relative">
            <div className={`relative flex items-center bg-card/80 backdrop-blur-xl border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.2)] transition-all duration-300 group ${messages.length === 0 ? 'rounded-2xl p-2' : 'rounded-full p-1.5'
              }`}>
              <button className={`p-3 text-zinc-400 hover:text-white transition-colors rounded-full hover:bg-white/5 ${messages.length === 0 ? '' : 'hidden md:block'
                }`}>
                <Sparkles size={20} />
              </button>

              <input
                type="text"
                value={inputText} // Assuming inputText is the state variable for the input
                onChange={(e) => setInputText(e.target.value)} // Assuming setInputText is the setter
                onKeyDown={(e) => { // Assuming handleKeyPress is replaced by this inline logic
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend('chat'); // Assuming handleSend is the function to send messages
                  }
                }}
                placeholder={messages.length === 0 ? "Ask Quantum Guru..." : "Type your query..."}
                className="flex-1 bg-transparent text-foreground placeholder:text-zinc-600 px-4 py-3 outline-none text-base md:text-lg font-light tracking-wide w-full"
              />

              <div className="flex items-center gap-1 pr-2">
                <button
                  onClick={() => handleSend('chat')} // Assuming handleSend is the function to send messages
                  disabled={!inputText.trim() || isLoading} // Assuming inputText and isLoading are state variables
                  className={`p-3 rounded-full transition-all duration-300 flex items-center justify-center ${inputText.trim() // Assuming inputText is the state variable for the input
                    ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:scale-105 active:scale-95'
                    : 'bg-zinc-800 text-zinc-600'
                    }`}
                >
                  <ArrowUp size={18} className="md:w-[20px] md:h-[20px]" />
                </button>
              </div>
            </div>

            <div className="text-center mt-3">
              <p className="text-[10px] md:text-[11px] text-zinc-500 font-medium tracking-wide">
                Quantum Guru • Turning Quantum Complexity into Clear Intelligence
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper Component for Sidebar Items
function SidebarItem({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) {
  return (
    <button className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${active
      ? 'bg-white/10 text-foreground font-medium shadow-[0_0_15px_rgba(255,255,255,0.05)] border border-white/5'
      : 'text-muted-foreground hover:bg-white/5 hover:text-foreground border border-transparent'
      }`}>
      <span className={active ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'}>{icon}</span>
      <span className="text-base flex-1 text-left">{label}</span>
      <Sparkles size={10} className={`opacity-0 group-hover:opacity-40 transition-opacity ${active ? 'text-white opacity-100' : 'text-zinc-500'}`} />
    </button>
  );
}

// Helper Component for Sidebar Dropdown Groups
function SidebarGroup({ icon, label, items }: { icon: React.ReactNode, label: string, items: { label: string, onClick?: () => void }[] }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-white/5 transition-all group"
      >
        <span className="text-zinc-500 group-hover:text-zinc-300">{icon}</span>
        <span className="text-base font-medium flex-1 text-left">{label}</span>
        <div className="flex items-center gap-2">
          <Sparkles size={10} className="text-zinc-800 group-hover:text-zinc-600 transition-colors opacity-0 group-hover:opacity-100" />
          <ChevronRight size={14} className={`transition-transform text-zinc-600 ${isOpen ? 'rotate-90' : ''}`} />
        </div>
      </button>
      {isOpen && (
        <div className="ml-9 mt-1 space-y-1 border-l border-gray-100">
          {items.map((item, idx) => (
            <button key={idx} onClick={item.onClick} className="w-full text-left px-4 py-2 text-sm text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-r-md transition-colors">
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
