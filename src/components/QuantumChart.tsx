"use client";

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface QuantumChartProps {
    data: Array<{ name: string; value: number }>;
}

export default function QuantumChart({ data }: QuantumChartProps) {
    return (
        <div className="w-full h-[300px] mt-6 bg-card/50 p-6 rounded-2xl border border-border animate-in slide-in-from-bottom-4 duration-1000">
            <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-6 border-b border-border pb-2">Quantum Histogram / Probability Distribution</h4>
            <ResponsiveContainer width="100%" height="80%">
                <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'var(--muted-foreground)', fontSize: 10, fontWeight: 700 }}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'var(--muted-foreground)', fontSize: 10, fontWeight: 700 }}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: 'var(--popover)',
                            border: '1px solid var(--border)',
                            borderRadius: '12px',
                            fontSize: '12px',
                            color: 'var(--popover-foreground)',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                        }}
                        itemStyle={{ color: 'var(--foreground)' }}
                        cursor={{ fill: 'var(--muted)' }}
                    />
                    <Bar
                        dataKey="value"
                        radius={[4, 4, 0, 0]}
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index % 2 === 0 ? 'var(--primary)' : 'var(--secondary)'} fillOpacity={0.9} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

