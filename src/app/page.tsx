"use client";

import React, { useState, useRef, useEffect } from 'react';
import { chatWithGemini } from './actions/chat';
import { Send, Mic, Menu, X, FileText, MapPin, HelpCircle, Phone, Globe, ChevronRight, User, Share2, Download, Sparkles, Loader2 } from 'lucide-react';

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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // --- GEMINI API INTEGRATION (Server Action) ---
  const callGemini = async (prompt: string, type: 'chat' | 'draft' = 'chat') => {
    const response = await chatWithGemini(prompt, type, lang);
    if (response.error) {
      return lang === 'hi' ? "क्षमा करें, अभी सेवा उपलब्ध नहीं है।" : "Sorry, I am currently facing connectivity issues.";
    }
    return response.text || "No response.";
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
      text: llmResponse,
      sender: 'bot',
      type: 'text', // Simple text from LLM
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, botResponse]);
    setIsLoading(false);
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
    <div className="flex h-screen bg-gray-50 font-sans overflow-hidden">

      {/* --- Sidebar (Mobile Responsive) --- */}
      <div className={`fixed inset-y-0 left-0 z-30 w-72 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:static flex flex-col`}>
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img src={GOV_LOGO_URL} alt="Bihar Emblem" className="h-12 w-12 object-contain" />
            <div>
              <h1 className="font-bold text-gray-800 text-lg leading-tight">Sahayak AI</h1>
              <p className="text-xs text-gray-500">Govt. of Bihar</p>
            </div>
          </div>
          <button onClick={toggleSidebar} className="md:hidden text-gray-500 hover:bg-gray-100 p-1 rounded">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 ml-2">Quick Services</div>
          <SidebarItem icon={<FileText size={18} />} label={lang === 'en' ? "Gram Katchry" : "ग्राम कचहरी"} active />
          <SidebarItem icon={<Download size={18} />} label={lang === 'en' ? "Nal Jal Yojana" : "नल जल योजना"} />
          <SidebarItem icon={<MapPin size={18} />} label={lang === 'en' ? "Gali-Nali Yojana" : "गली-नाली योजना"} />
          <SidebarItem icon={<User size={18} />} label={lang === 'en' ? "Panchayat Sarkar Bhawan" : "पंचायत सरकार भवन"} />

          <div className="mt-8 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 ml-2">Support</div>
          <SidebarItem icon={<HelpCircle size={18} />} label={lang === 'en' ? "Help Center" : "सहायता केंद्र"} />
          <SidebarItem icon={<Phone size={18} />} label={lang === 'en' ? "Emergency Contact" : "आपातकालीन संपर्क"} />
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
      <div className="flex-1 flex flex-col h-full relative">

        {/* Header */}
        <header className="bg-white h-16 border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 shadow-sm z-10">
          <div className="flex items-center">
            <button onClick={toggleSidebar} className="mr-4 md:hidden text-gray-600 hover:bg-gray-100 p-2 rounded-full">
              <Menu size={20} />
            </button>
            <div className="flex flex-col">
              <span className="font-semibold text-gray-800 flex items-center gap-2">
                {lang === 'en' ? "Panchayati Raj Department" : "पंचायती राज विभाग"}
                <span className="bg-blue-100 text-blue-800 text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wide">Beta</span>
              </span>
              <span className="text-xs text-green-600 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                Online
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={toggleLang}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-full border border-gray-300 bg-white hover:bg-gray-50 text-sm font-medium transition-colors"
            >
              <Globe size={14} className="text-gray-500" />
              <span>{lang === 'en' ? "English" : "हिंदी"}</span>
            </button>
          </div>
        </header>

        {/* Messages List */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 bg-[#f3f4f6]">
          <div className="max-w-3xl mx-auto space-y-6">

            {/* Disclaimer */}
            <div className="flex justify-center">
              <div className="bg-yellow-50 border border-yellow-100 text-yellow-800 text-xs px-4 py-2 rounded-lg text-center max-w-md">
                {lang === 'en'
                  ? "Note: Sahayak AI is an AI assistant. Please verify official records at state.bihar.gov.in/prd."
                  : "नोट: सहायक एआई एक एआई असिस्टेंट है। कृपया state.bihar.gov.in/prd पर आधिकारिक रिकॉर्ड देखें।"
                }
              </div>
            </div>

            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex max-w-[90%] lg:max-w-[80%] ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'} items-end gap-2`}>

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
        <div className="bg-[#f3f4f6] px-4 pb-2">
          <div className="max-w-3xl mx-auto flex gap-2 overflow-x-auto no-scrollbar pb-2">
            {(lang === 'en' ? SUGGESTIONS : HINDI_SUGGESTIONS).map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => setInputText(suggestion)}
                className="flex-shrink-0 bg-white border border-gray-200 text-gray-600 px-3 py-1.5 rounded-full text-xs hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-all whitespace-nowrap shadow-sm"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>

        {/* Input Area */}
        <footer className="bg-white p-4 border-t border-gray-200">
          <div className="max-w-3xl mx-auto relative">
            <div className="flex items-end gap-2 bg-gray-50 border border-gray-300 rounded-2xl p-2 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all shadow-sm">

              <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                  <span className="text-lg pb-1">+</span>
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
                placeholder={lang === 'en' ? "Ask about land records, mutation..." : "जमीन रिकॉर्ड, दाखिल-खारिज के बारे में पूछें..."}
                className="flex-1 bg-transparent border-none focus:ring-0 text-gray-800 placeholder-gray-400 resize-none max-h-32 py-2 text-sm"
                rows={1}
              />

              {inputText.trim() ? (
                <>
                  {/* Draft Feature Button */}
                  <button
                    onClick={() => handleSend('draft')}
                    className="p-2 bg-purple-100 text-purple-600 rounded-xl hover:bg-purple-200 transition-all shadow-sm flex items-center gap-1 text-xs font-bold"
                    title={lang === 'en' ? "Draft Formal Application" : "आवेदन ड्राफ्ट करें"}
                  >
                    <Sparkles size={16} />
                    <span className="hidden sm:inline">{lang === 'en' ? "Draft" : "ड्राफ्ट"}</span>
                  </button>

                  <button
                    onClick={() => handleSend('chat')}
                    className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-md transform active:scale-95"
                  >
                    <Send size={18} />
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsRecording(!isRecording)}
                  className={`p-2 rounded-xl transition-all ${isRecording ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'}`}
                >
                  <Mic size={18} />
                </button>
              )}
            </div>

            <div className="text-center mt-2">
              <p className="text-[10px] text-gray-400">
                Powered by Sahayak AI • Protected by Bihar Data Privacy Policy
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
