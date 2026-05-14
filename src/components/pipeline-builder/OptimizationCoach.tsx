'use client';

import React, { useState, useRef, useEffect } from 'react';
import { usePipelineStore } from '@/store/usePipelineStore';
import { User, Send, StopCircle, RotateCcw, CheckCircle2, Circle } from 'lucide-react';
import { builderChat } from '@/app/actions/builder-chat';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
}

type Stage = 1 | 2 | 3 | 4 | 5;

const STAGES = [
  { id: 1, label: 'Name' },
  { id: 2, label: 'Description' },
  { id: 3, label: 'Variables' },
  { id: 4, label: 'Constraints' },
  { id: 5, label: 'Output' },
];

const SYSTEM_PROMPTS: Record<Stage, string> = {
  1: `You are the Quantum Guru Optimization Coach helping a user define an optimization problem.
You are on STAGE 1: Get the problem NAME.
Ask the user for a short, clear name for their optimization problem (e.g., "Call Center Routing", "Supply Chain Optimizer").
Keep your response to 1-2 sentences. Be friendly and encouraging.
When the user provides a name, confirm it and extract it.
ALWAYS end your message with a JSON block:
\`\`\`json
{"stage": 1, "problemName": "The extracted name here or empty string if not yet provided"}
\`\`\``,

  2: `You are the Quantum Guru Optimization Coach.
You are on STAGE 2: Get the problem DESCRIPTION.
The user has already provided a problem name. Now ask them to describe the problem in detail — what are they trying to minimize or maximize? What is the business context?
Keep it conversational, 2-3 sentences max.
ALWAYS end your message with a JSON block:
\`\`\`json
{"stage": 2, "problemDefinition": "Extracted full description here or empty string if not yet clear"}
\`\`\``,

  3: `You are the Quantum Guru Optimization Coach.
You are on STAGE 3: Extract VARIABLES with weight and priority.
Ask the user to list the key variables (inputs) for their optimization. For each one, gently ask about its relative importance (weight from 0.1 to 1.0).
Help them identify 2-5 good variables.
ALWAYS end your message with a JSON block:
\`\`\`json
{"stage": 3, "variables": [{"name": "Variable Name", "priority": 1, "weight": 0.9, "description": "What this variable represents"}]}
\`\`\`
If no variables are confirmed yet, use an empty array.`,

  4: `You are the Quantum Guru Optimization Coach.
You are on STAGE 4: Identify CONSTRAINTS.
Ask the user what constraints or limits apply to this problem (e.g., "maximum 20 agents online", "budget must not exceed $50K").
Summarize the constraints they give you clearly.
ALWAYS end your message with a JSON block:
\`\`\`json
{"stage": 4, "currentIssues": "Summarized constraints here or empty string if none yet"}
\`\`\``,

  5: `You are the Quantum Guru Optimization Coach.
You are on STAGE 5: Define OUTPUT VISUALS and analysis prompt.
Ask the user how they want to see the results — charts? tables? What should the AI analysis focus on?
Suggest 1-2 sensible visualizations based on the problem context.
ALWAYS end your message with a JSON block:
\`\`\`json
{"stage": 5, "analysisPrompt": "Describe what the AI should analyze after execution", "outputVisuals": [{"type": "bar_chart", "title": "Chart Title", "xAxis": "X label", "yAxis": "Y label"}]}
\`\`\`
Valid types: bar_chart, line_chart, scatter_chart, table.`,
};

export default function OptimizationCoach() {
  const { updateField, addVariable, setOutputVisuals, resetPipeline } = usePipelineStore();
  const [stage, setStage] = useState<Stage>(1);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'assistant',
      content: "Hello! I'm your Optimization Coach. I'll guide you through defining your problem step by step.\n\nLet's start: what would you like to name this optimization problem? (e.g., \"Telecom Call Routing\", \"Warehouse Scheduling\")",
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleReset = () => {
    resetPipeline();
    setStage(1);
    setMessages([{
      id: Date.now().toString(),
      sender: 'assistant',
      content: "Blueprint reset. Let's start fresh — what would you like to name this optimization problem?",
    }]);
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'user', content: userMsg }]);
    setIsTyping(true);

    try {
      const systemPrompt = SYSTEM_PROMPTS[stage];
      const aiResponseObj = await builderChat(userMsg, systemPrompt);

      if (aiResponseObj.error) throw new Error(aiResponseObj.error);

      let aiResponse = aiResponseObj.text;

      // Parse structured JSON from the LLM response
      const jsonMatch = aiResponse.match(/```json([\s\S]*?)```/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[1]);
          const parsedStage: Stage = parsed.stage as Stage;

          // Apply store updates based on the stage data
          if (parsedStage === 1 && parsed.problemName) {
            updateField('problemName', parsed.problemName);
            if (parsed.problemName.trim()) setStage(2);
          }
          if (parsedStage === 2 && parsed.problemDefinition) {
            updateField('problemDefinition', parsed.problemDefinition);
            if (parsed.problemDefinition.trim()) setStage(3);
          }
          if (parsedStage === 3 && parsed.variables && Array.isArray(parsed.variables) && parsed.variables.length > 0) {
            parsed.variables.forEach((v: any) => {
              addVariable(v.name, v.weight ?? 1.0, v.description ?? '');
            });
            setStage(4);
          }
          if (parsedStage === 4 && parsed.currentIssues) {
            updateField('currentIssues', parsed.currentIssues);
            if (parsed.currentIssues.trim()) setStage(5);
          }
          if (parsedStage === 5) {
            if (parsed.analysisPrompt) updateField('analysisPrompt', parsed.analysisPrompt);
            if (parsed.outputVisuals && Array.isArray(parsed.outputVisuals)) {
              setOutputVisuals(parsed.outputVisuals);
            }
          }

          // Strip JSON block from visible message
          aiResponse = aiResponse.replace(/```json[\s\S]*?```/g, '').trim();
        } catch (e) {
          console.error('Failed to parse structural JSON from AI', e);
        }
      }

      setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'assistant', content: aiResponse }]);
    } catch (error) {
      setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'assistant', content: 'Error: Neural link unstable. Could not connect to the reasoning engine.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-transparent overflow-hidden">

      {/* Stage Progress Bar */}
      <div className="px-4 pt-3 pb-2 shrink-0 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            Stage {stage} of 5
          </span>
          <button
            onClick={handleReset}
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-destructive transition-colors"
            title="Reset blueprint"
          >
            <RotateCcw size={10} /> Reset
          </button>
        </div>
        <div className="flex items-center gap-1">
          {STAGES.map((s, i) => {
            const isDone = stage > s.id;
            const isCurrent = stage === s.id;
            return (
              <React.Fragment key={s.id}>
                <div className="flex flex-col items-center gap-1 flex-1">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center transition-all duration-300 ${
                      isDone ? 'bg-primary text-primary-foreground' :
                      isCurrent ? 'bg-primary/20 border-2 border-primary animate-pulse' :
                      'bg-muted border border-border'
                    }`}
                  >
                    {isDone
                      ? <CheckCircle2 size={12} className="text-primary-foreground" />
                      : <span className={`text-[9px] font-bold ${isCurrent ? 'text-primary' : 'text-muted-foreground'}`}>{s.id}</span>
                    }
                  </div>
                  <span className={`text-[9px] font-medium ${isCurrent ? 'text-primary' : isDone ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {s.label}
                  </span>
                </div>
                {i < STAGES.length - 1 && (
                  <div className={`h-px flex-1 mb-4 transition-colors ${stage > s.id ? 'bg-primary' : 'bg-border'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex w-full ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex max-w-[95%] md:max-w-[85%] ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'} items-start gap-3`}>
              {/* Avatar */}
              <div className={`w-8 h-8 mt-1 rounded-xl flex items-center justify-center shrink-0 ${msg.sender === 'user'
                  ? 'bg-secondary border border-border shadow-sm'
                  : 'bg-white border border-border shadow-sm p-1'
                }`}>
                {msg.sender === 'user' ? <User size={16} className="text-foreground" /> : (
                  <div className="w-full h-full overflow-hidden rounded-xl">
                    <img src="/qg-icon.png" alt="QG" className="w-full h-full object-contain" />
                  </div>
                )}
              </div>
              {/* Bubble */}
              <div className={`rounded-2xl px-5 py-4 shadow-sm text-sm leading-relaxed whitespace-pre-wrap ${msg.sender === 'user'
                  ? 'bg-secondary text-foreground border border-border rounded-tr-sm'
                  : 'bg-card text-card-foreground border border-border rounded-tl-sm shadow-sm min-w-0 max-w-full overflow-hidden'
                }`}>
                {msg.content}
              </div>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex w-full justify-start animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex flex-row items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white border border-border flex items-center justify-center shrink-0 p-1 shadow-sm">
                <img src="/qg-icon.png" className="w-full h-full object-contain" alt="QG typing" />
              </div>
              <div className="bg-card text-card-foreground border border-border rounded-2xl rounded-tl-sm shadow-sm px-5 py-4">
                <div className="flex space-x-1 items-center h-full">
                  <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce"></div>
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 shrink-0 bg-transparent z-20">
        <div className="relative flex items-end gap-2 bg-card/80 backdrop-blur-xl border border-border rounded-2xl shadow-lg p-2 transition-all focus-within:ring-1 focus-within:ring-ring focus-within:border-ring focus-within:bg-card">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder={`Stage ${stage}: ${STAGES[stage - 1].label}...`}
            rows={1}
            className="flex-1 max-h-32 bg-transparent text-foreground placeholder:text-muted-foreground text-sm px-4 py-2 focus:outline-none resize-none scrollbar-hide"
            style={{ minHeight: '44px' }}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isTyping}
            className="p-2.5 rounded-xl text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md active:scale-95 mb-0.5 font-semibold flex items-center justify-center"
            style={{ backgroundColor: 'oklch(0.623 0.214 259.815)' }}
          >
            {isTyping ? <StopCircle size={16} className="animate-pulse" /> : <Send size={16} fill="currentColor" />}
          </button>
        </div>
      </div>
    </div>
  );
}
