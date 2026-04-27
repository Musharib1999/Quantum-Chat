"use client";

import React, { useState, useEffect } from 'react';
import { MessageSquare } from 'lucide-react';
import { getChatLogs, type ChatLogType } from '@/app/actions/admin';

export default function ChatLogViewer() {
    const [chatLogs, setChatLogs] = useState<ChatLogType[]>([]);

    useEffect(() => {
        getChatLogs().then(setChatLogs);
    }, []);

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <MessageSquare className="text-purple-400" /> Interaction Logs
            </h2>
            <div className="bg-card/60 backdrop-blur-md rounded-2xl shadow-xl border border-border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-secondary/30 border-b border-border">
                            <tr className="text-muted-foreground font-bold text-xs uppercase tracking-wider">
                                <th className="p-4">Time</th>
                                <th className="p-4">User Query</th>
                                <th className="p-4">AI Response</th>
                                <th className="p-4">Guardrails</th>
                                <th className="p-4">Source</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {chatLogs.map((log) => (
                                <tr key={log.id} className="hover:bg-secondary/10 transition-colors">
                                    <td className="p-4 text-xs text-muted-foreground whitespace-nowrap font-mono">
                                        {new Date(log.timestamp).toLocaleString()}
                                    </td>
                                    <td className="p-4 text-sm text-foreground font-medium max-w-[150px] md:max-w-xs truncate" title={log.userQuery}>
                                        {log.userQuery}
                                    </td>
                                    <td className="p-4 text-sm text-muted-foreground max-w-[150px] md:max-w-md truncate" title={log.aiResponse}>
                                        {log.aiResponse}
                                    </td>
                                    <td className="p-4 whitespace-nowrap text-xs">
                                        <div className="flex flex-col gap-1">
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full w-fit ${log.guardrailsStatus === 'violated'
                                                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                                : 'bg-green-500/20 text-green-400 border border-green-500/30'
                                                }`}>
                                                {log.guardrailsStatus?.toUpperCase() || 'PASSED'}
                                            </span>
                                            <span className="text-[10px] text-zinc-600">
                                                {log.activeGuardrails?.length || 0} rules
                                            </span>
                                        </div>
                                    </td>
                                    <td className="p-4 whitespace-nowrap">
                                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${log.source === 'gemini' ? 'bg-white0/10 text-[#0F172A] border-blue-500/20' :
                                            log.source.includes('kb') ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                                'bg-zinc-800 text-zinc-500 border-zinc-700'
                                            }`}>
                                            {log.source === 'gemini' ? 'Groq' : log.source}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {chatLogs.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-12 text-center text-zinc-600">
                                        <div className="flex flex-col items-center gap-2">
                                            <MessageSquare size={32} className="opacity-20" />
                                            <span>No logs found yet.</span>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
