import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { getSharedSession } from '@/app/actions/history';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import { ArrowLeft, Sparkles, User } from 'lucide-react';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const session = await getSharedSession(id);
  if (!session) {
    return {
      title: 'Shared Simulation Lab | QuantumGuru',
      description: 'Run and remix quantum computing simulations live in your browser.'
    };
  }

  const title = session.title || 'Quantum Simulation Lab';
  const author = session.userEmail ? session.userEmail.split('@')[0] : 'Quantum Engineer';
  const ogUrl = `https://qc.guru/api/og?title=${encodeURIComponent(title)}&author=${encodeURIComponent(author)}&pipeline=${encodeURIComponent(session.pipeline || 'coder')}`;

  return {
    title: `${title} | QuantumGuru Interactive Lab`,
    description: `Run and remix this interactive ${session.pipeline || 'quantum'} simulation live in your browser on QuantumGuru. No signup required.`,
    openGraph: {
      title: `${title} - QuantumGuru Simulation`,
      description: `Run and remix this interactive quantum algorithm live in your browser.`,
      images: [{ url: ogUrl, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: title,
      description: `Run and remix this interactive quantum algorithm live in your browser.`,
      images: [ogUrl],
    },
  };
}

export default async function SharedLabPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSharedSession(id);

  if (!session) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center text-slate-800 p-6 font-sans">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-md text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto text-xl font-bold">
            !
          </div>
          <h2 className="text-xl font-extrabold text-slate-800">Lab Not Found</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            This shared simulation link may have expired or is set to private.
          </p>
          <Link 
            href="/quantum-assistant" 
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Launch Quantum Workspace</span>
          </Link>
        </div>
      </div>
    );
  }

  const messages = session.messages || [];

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col font-sans">
      {/* Top Bar matching QuantumGuru Header */}
      <header className="h-14 border-b border-slate-200 bg-white/90 backdrop-blur px-6 flex items-center justify-between shrink-0 sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <img src="/qg-icon.png" alt="Quantum Guru" className="w-8 h-8 object-contain rounded-lg shadow-xs" />
            <span className="font-bold text-slate-800 text-sm tracking-tight">QuantumGuru</span>
          </div>
          <span className="text-slate-300">|</span>
          <span className="text-[10px] font-extrabold uppercase tracking-wider bg-blue-50 text-blue-600 border border-blue-200 px-2.5 py-0.5 rounded-full">
            Verified Public Record
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/quantum-assistant?remix=${session.shareId}`}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <Sparkles className="w-4 h-4 text-blue-200" />
            <span>Remix & Edit Circuit</span>
          </Link>
        </div>
      </header>

      {/* Shared Lab Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-6 md:p-8 space-y-6 overflow-y-auto">
        
        {/* Lab Overview Header Box */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                {session.pipeline ? session.pipeline.toUpperCase() : 'GENERAL'} PIPELINE
              </span>
            </div>
            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
              {messages.length} Turn{messages.length === 1 ? '' : 's'} Recorded
            </span>
          </div>

          <h1 className="text-xl font-extrabold text-slate-800">
            {session.title || 'Quantum Simulation'}
          </h1>
          <p className="text-xs text-slate-500 leading-relaxed">
            This is a read-only interactive execution record saved on QuantumGuru servers. Click <strong className="text-blue-600 font-semibold">Remix & Edit Circuit</strong> above to clone this simulation into your own interactive workspace.
          </p>
        </div>

        {/* Message Feed matching QuantumGuru chat layout */}
        <div className="space-y-6 pt-2">
          {messages.map((msg: any) => (
            <div 
              key={msg.id} 
              className={`flex w-full min-w-0 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex min-w-0 max-w-[85%] gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'} items-start`}>
                
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-xs border ${
                  msg.sender === 'user' 
                    ? 'bg-slate-100 border-slate-200 text-slate-600' 
                    : 'bg-white border-slate-200 p-0 overflow-hidden'
                }`}>
                  {msg.sender === 'user' 
                    ? <User className="w-4 h-4" /> 
                    : <img src="/qg-icon.png" alt="Quantum Guru" className="w-8 h-8 object-cover rounded-lg" />}
                </div>

                {/* Message Bubble */}
                <div
                  className={`min-w-0 rounded-2xl px-5 py-3.5 shadow-xs text-sm leading-relaxed overflow-hidden ${
                    msg.sender === 'user' 
                      ? 'text-white rounded-tr-xs' 
                      : 'bg-white border border-slate-200 text-slate-700 rounded-tl-xs'
                  }`}
                  style={msg.sender === 'user' ? { backgroundColor: '#2E65BF' } : {}}
                >
                  {msg.sender === 'user' ? (
                    <div className="whitespace-pre-wrap break-words">
                      {msg.text}
                    </div>
                  ) : (
                    <div className="prose prose-slate max-w-none text-slate-700 overflow-hidden break-words">
                      <MarkdownRenderer 
                        content={msg.text} 
                        suggestedSolver={msg.workflowSteps?.suggested_solver} 
                        hideRunButton={true} 
                        messageId={msg.id}
                        executionResult={msg.executionResult}
                      />
                    </div>
                  )}
                </div>

              </div>
            </div>
          ))}
        </div>

      </main>
    </div>
  );
}
