"use client";

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface QuantumChartProps {
    data: Array<{ name: string; value: number }>;
}

export default function QuantumChart({ data }: QuantumChartProps) {
    return (
        <div className="w-full h-[300px] mt-6 bg-zinc-950/40 p-6 rounded-2xl border border-white/5 animate-in slide-in-from-bottom-4 duration-1000">
            <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-6 border-b border-white/5 pb-2">Quantum Histogram / Probability Distribution</h4>
            <ResponsiveContainer width="100%" height="80%">
                <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#71717a', fontSize: 10, fontWeight: 700 }}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#71717a', fontSize: 10, fontWeight: 700 }}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: '#09090b',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '12px',
                            fontSize: '12px',
                            color: '#fff'
                        }}
                        itemStyle={{ color: '#fff' }}
                        cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                    />
                    <Bar
                        dataKey="value"
                        radius={[4, 4, 0, 0]}
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#fafafa' : '#27272a'} fillOpacity={0.9} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

