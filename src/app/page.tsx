"use client";

import React, { useState, useRef, useEffect } from 'react';
import { chatWithGemini, checkGeminiConnection } from './actions/chat';
import { getQaPairs } from './actions/admin';
import { Send, Mic, Menu, X, FileText, MapPin, HelpCircle, Phone, Globe, ChevronRight, User, Share2, Download, Sparkles, Loader2, AlertTriangle } from 'lucide-react';

// --- Assets & Constants ---
const GOV_LOGO_URL = "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/Seal_of_Bihar.svg/1200px-Seal_of_Bihar.svg.png";

const SUGGESTIONS = [
  "Check Application Status",
  "Mukhyamantri Nischay Yojna",
  "Jan Shikayat",
  "PRIs Members Details"
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
        <p className="text-[11px] text-green-600">Your request has been received. Reference ID: PRD-{Math.floor(Math.random() * 89999 + 10000)}</p>
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
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: "Namaste! I am Sahayak AI, your AI assistant for the Panchayati Raj Department. How can I assist you today?",
      sender: 'bot',
      timestamp: "Just now"
    }
  ]);
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

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    checkGeminiConnection().then(setIsConnected);
  }, []);

  // --- GEMINI API INTEGRATION (Server Action) ---
  const callGemini = async (prompt: string, type: 'chat' | 'draft' = 'chat') => {
    const response = await chatWithGemini(prompt, type, lang);
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

    const botResponse: Message = {
      id: messages.length + 2,
      text: llmResponse.error ? (lang === 'hi' ? "क्षमा करें, अभी सेवा उपलब्ध नहीं है।" : "Sorry, I am currently facing connectivity issues.") : llmResponse.text,
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
    <div className="flex h-screen w-full bg-gray-50 font-sans overflow-hidden">
      {/* Connection Warning Banner */}
      {!isConnected && (
        <div className="fixed top-0 left-0 right-0 bg-red-600 text-white text-[10px] md:text-xs font-bold px-4 py-2 text-center z-[60] flex items-center justify-center gap-2">
          <AlertTriangle size={12} className="shrink-0" />
          <span>Warning: GEMINI_API_KEY is missing. AI will not function.</span>
        </div>
      )}

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* --- Sidebar (Mobile Responsive) --- */}
      <div className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:static flex flex-col shadow-2xl md:shadow-none`}>
        <div className="p-4 md:p-6 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img src={GOV_LOGO_URL} alt="Bihar Emblem" className="h-10 w-10 md:h-12 md:w-12 object-contain" />
            <div>
              <h1 className="font-bold text-gray-800 text-base md:text-lg leading-tight">Sahayak AI</h1>
              <p className="text-[10px] md:text-xs text-gray-500">Govt. of Bihar</p>
            </div>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-gray-500 hover:bg-gray-100 p-2 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 ml-2">Main Menu</div>
          <SidebarItem icon={<Globe size={18} />} label={lang === 'en' ? "Home" : "होम"} active />

          <div className="mt-6 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 ml-2">Services</div>

          <SidebarGroup
            icon={<FileText size={18} />}
            label={lang === 'en' ? "Forms" : "फॉर्म्स"}
            items={dynamicForms.length > 0 ? dynamicForms.map(f => ({ label: f.question, onClick: () => handleSidebarFormClick(f) })) : [
              { label: lang === 'en' ? "Grievance Redressal" : "शिकायत निवारण", onClick: () => { } },
              { label: lang === 'en' ? "Land Mutation Form" : "दाखिल-खारिज फॉर्म", onClick: () => { } }
            ]}
          />

          <SidebarGroup
            icon={<MapPin size={18} />}
            label={lang === 'en' ? "Schemes" : "योजनाएं"}
            items={[
              { label: lang === 'en' ? "Nal Jal Yojana" : "नल जल योजना" },
              { label: lang === 'en' ? "Gali-Nali Yojana" : "गली-नाली योजना" },
              { label: lang === 'en' ? "Solar Street Light" : "सोलर स्ट्रीट लाइट" }
            ]}
          />

          <div className="mt-8 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 ml-2">Quick Access</div>
          <SidebarItem icon={<FileText size={18} />} label={lang === 'en' ? "Gram Katchry" : "ग्राम कचहरी"} />
          <SidebarItem icon={<User size={18} />} label={lang === 'en' ? "Panchayat Sarkar Bhawan" : "पंचायत सरकार भवन"} />

          <div className="mt-8 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 ml-2">Support</div>
          <SidebarItem icon={<HelpCircle size={18} />} label={lang === 'en' ? "Help Center" : "सहायता केंद्र"} />
          <SidebarItem icon={<Phone size={18} />} label={lang === 'en' ? "Emergency" : "आपातकालीन"} />
        </nav>

        <div className="p-4 border-t border-gray-100 bg-gray-50">
          <div className="flex items-center justify-between bg-green-50 p-3 rounded-lg border border-green-100">
            <div className="flex flex-col">
              <span className="text-xs text-green-800 font-medium">Gram Swaraj Abhiyan</span>
              <span className="text-[10px] text-green-600">Active until Sep 2026</span>
            </div>
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
          </div>
        </div>
      </div>

      {/* --- Main Chat Area --- */}
      <div className="flex-1 flex flex-col h-full relative min-w-0 w-full overflow-hidden">

        {/* Header */}
        <header className="bg-white h-16 border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 shadow-sm z-10 shrink-0 w-full overflow-hidden">
          <div className="flex items-center min-w-0">
            <button onClick={() => setIsSidebarOpen(true)} className="mr-3 md:hidden text-gray-600 hover:bg-gray-100 p-2 rounded-full flex-shrink-0">
              <Menu size={20} />
            </button>
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-gray-800 flex items-center gap-1.5 text-sm md:text-base whitespace-nowrap overflow-hidden">
                <span className="truncate">{lang === 'en' ? "Panchayati Raj Dept" : "पंचायती राज विभाग"}</span>
                <span className="bg-blue-100 text-blue-800 text-[9px] md:text-[10px] px-1.5 md:px-2 py-0.5 rounded-full uppercase font-bold tracking-wide flex-shrink-0">Beta</span>
              </span>
              <span className="text-[10px] text-green-600 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                Online
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-2 flex-shrink-0">
            <button
              onClick={toggleLang}
              className="flex items-center space-x-1 px-2 md:px-3 py-1 md:py-1.5 rounded-full border border-gray-300 bg-white hover:bg-gray-50 text-[11px] md:text-sm font-medium transition-colors"
            >
              <Globe size={12} className="text-gray-500 md:block hidden" />
              <span>{lang === 'en' ? "English" : "हिंदी"}</span>
            </button>
          </div>
        </header>

        {/* Messages List */}
        <main className="flex-1 overflow-y-auto p-3 md:p-4 lg:p-6 bg-[#f3f4f6] min-w-0 w-full overflow-x-hidden">
          <div className="w-full max-w-3xl mx-auto space-y-6">

            {/* Disclaimer */}
            <div className="flex justify-center w-full">
              <div className="w-full max-w-md bg-yellow-50 border border-yellow-100 text-yellow-800 text-[11px] md:text-xs px-4 py-2 rounded-lg text-center shadow-sm capitalize">
                {lang === 'en'
                  ? "Sahayak AI is an AI assistant. Verify official records at state.bihar.gov.in/prd."
                  : "सहायक एआई एक एआई असिस्टेंट है। कृपया state.bihar.gov.in/prd पर आधिकारिक रिकॉर्ड देखें।"
                }
              </div>
            </div>

            {messages.map((msg) => (
              <div key={msg.id} className={`flex w-full ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex max-w-[95%] md:max-w-[85%] lg:max-w-[80%] ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'} items-end gap-2`}>

                  {/* Avatar */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.sender === 'user' ? 'bg-blue-600' : 'bg-white border border-gray-200'}`}>
                    {msg.sender === 'user' ? <User size={14} className="text-white" /> : <img src={GOV_LOGO_URL} className="w-5 h-5" alt="Bot" />}
                  </div>

                  {/* Bubble */}
                  <div className={`rounded-2xl px-5 py-3 shadow-sm text-sm leading-relaxed whitespace-pre-wrap ${msg.sender === 'user'
                    ? 'bg-blue-600 text-white rounded-br-none'
                    : msg.sender === 'system'
                      ? 'bg-gray-200 text-gray-600 text-xs text-center w-full rounded-lg'
                      : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'
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
                      <div className="mt-3 bg-white/40 backdrop-blur-md rounded-2xl p-4 border border-white/50 shadow-sm overflow-hidden w-full group">
                        <div className="flex items-start gap-3">
                          <div className="bg-blue-600 p-2 rounded-xl text-white shadow-md">
                            <Globe size={20} />
                          </div>
                          <div className="flex-1">
                            <h4 className="text-sm font-bold text-gray-800 mb-1">Official Resource Found</h4>
                            <p className="text-xs text-gray-500 mb-3 truncate max-w-[200px]">{msg.sourceUrl}</p>
                            <a
                              href={msg.sourceUrl}
                              target="_blank"
                              className="inline-flex items-center gap-2 bg-white text-blue-600 px-4 py-2 rounded-xl text-xs font-bold border border-blue-100 hover:bg-blue-600 hover:text-white transition-all shadow-sm active:scale-95"
                            >
                              Visit Official Portal
                              <ChevronRight size={14} />
                            </a>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* NEW: Smart Form Box */}
                    {msg.form && (
                      <SmartForm config={msg.form} />
                    )}

                    {/* Timestamp */}
                    <div className={`text-[10px] mt-1 ${msg.sender === 'user' ? 'text-blue-100 text-right' : 'text-gray-400'}`}>
                      {msg.timestamp}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm flex items-center gap-2">
                  <Loader2 size={16} className="text-blue-600 animate-spin" />
                  <span className="text-xs text-gray-500">Sahayak AI is typing...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </main>

        {/* Suggestions */}
        <div className="bg-[#f3f4f6] px-4 pb-1 overflow-hidden shrink-0 w-full">
          <div className="w-full max-w-3xl mx-auto flex gap-2 overflow-x-auto overflow-y-hidden no-scrollbar py-2 touch-pan-x">
            {(lang === 'en' ? SUGGESTIONS : HINDI_SUGGESTIONS).map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => setInputText(suggestion)}
                className="flex-shrink-0 bg-white border border-gray-200 text-gray-600 px-3 py-1.5 rounded-full text-[11px] md:text-xs hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-all whitespace-nowrap shadow-sm"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>

        {/* Input Area */}
        <footer className="bg-white p-2 md:p-4 border-t border-gray-200 shrink-0 mt-auto w-full">
          <div className="w-full max-w-3xl mx-auto relative px-1">
            <div className="flex items-end gap-1 md:gap-2 bg-gray-50 border border-gray-300 rounded-2xl p-1.5 md:p-2 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all shadow-sm">

              <button className="p-1.5 md:p-2 text-gray-400 hover:text-gray-600 transition-colors">
                <div className="w-5 h-5 md:w-6 md:h-6 bg-gray-200 rounded-full flex items-center justify-center">
                  <span className="text-base md:text-lg pb-1">+</span>
                </div>
              </button>

              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend('chat');
                  }
                }}
                placeholder={lang === 'en' ? "Ask Sahayak..." : "सहायक से पूछें..."}
                className="flex-1 bg-transparent border-none focus:ring-0 text-gray-800 placeholder-gray-400 resize-none max-h-32 py-2 text-sm"
                rows={1}
              />

              {inputText.trim() ? (
                <div className="flex items-center gap-1 md:gap-2">
                  <button
                    onClick={() => handleSend('draft')}
                    className="p-1.5 md:p-2 bg-purple-100 text-purple-600 rounded-xl hover:bg-purple-200 transition-all shadow-sm flex items-center gap-1 text-[10px] md:text-xs font-bold"
                  >
                    <Sparkles size={14} className="md:w-4 md:h-4" />
                    <span className="hidden sm:inline">Draft</span>
                  </button>

                  <button
                    onClick={() => handleSend('chat')}
                    className="p-1.5 md:p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-md transform active:scale-95"
                  >
                    <Send size={16} className="md:w-[18px] md:h-[18px]" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsRecording(!isRecording)}
                  className={`p-1.5 md:p-2 rounded-xl transition-all ${isRecording ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'}`}
                >
                  <Mic size={16} className="md:w-[18px] md:h-[18px]" />
                </button>
              )}
            </div>

            <div className="text-center mt-1.5">
              <p className="text-[9px] md:text-[10px] text-gray-400">
                Sahayak AI • Bihar Government Digital Assistant
              </p>
            </div>
          </div>
        </footer>

      </div>
    </div>
  );
}

// Helper Component for Sidebar Items
function SidebarItem({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) {
  return (
    <button className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${active
      ? 'bg-blue-50 text-blue-700 font-medium'
      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`}>
      <span className={active ? 'text-blue-600' : 'text-gray-400'}>{icon}</span>
      <span className="text-sm">{label}</span>
      {active && <ChevronRight size={14} className="ml-auto" />}
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
        className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-100 transition-all"
      >
        <span className="text-gray-400 group-hover:text-blue-600">{icon}</span>
        <span className="text-sm font-medium">{label}</span>
        <ChevronRight size={14} className={`ml-auto transition-transform text-gray-400 ${isOpen ? 'rotate-90' : ''}`} />
      </button>
      {isOpen && (
        <div className="ml-9 mt-1 space-y-1 border-l border-gray-100">
          {items.map((item, idx) => (
            <button key={idx} onClick={item.onClick} className="w-full text-left px-4 py-2 text-xs text-gray-500 hover:text-blue-600 hover:bg-blue-50/50 rounded-r-md transition-colors">
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
