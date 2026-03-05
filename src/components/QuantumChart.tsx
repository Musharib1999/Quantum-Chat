"use client";

import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import dynamic from 'next/dynamic';

// Dynamically import Plotly to avoid SSR issues in Next.js
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

interface QuantumChartProps {
    data: any; // Can be Recharts array or Plotly JSON object
}

export default function QuantumChart({ data }: QuantumChartProps) {
    const isPlotly = data && data.type === 'plotly';

    if (isPlotly) {
        return (
            <div className="w-full h-[400px] mt-6 bg-card/50 p-2 sm:p-4 rounded-2xl border border-border animate-in slide-in-from-bottom-4 duration-1000 overflow-hidden">
                <Plot
                    data={data.plotlyData}
                    layout={{
                        ...data.plotlyLayout,
                        autosize: true,
                        paper_bgcolor: 'transparent',
                        plot_bgcolor: 'transparent',
                        font: { color: 'var(--muted-foreground)', family: 'inherit', size: 10 },
                        margin: { t: 30, r: 10, l: 40, b: 30 },
                    }}
                    useResizeHandler={true}
                    style={{ width: '100%', height: '100%' }}
                    config={{ displayModeBar: false, responsive: true }}
                />
            </div>
        );
    }

    // Legacy Recharts implementation
    const rechartsData = Array.isArray(data) ? data : data?.data || [];

    return (
        <div className="w-full h-[300px] mt-6 bg-card/50 p-6 rounded-2xl border border-border animate-in slide-in-from-bottom-4 duration-1000">
            <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-6 border-b border-border pb-2">Quantum Histogram / Probability Distribution</h4>
            <ResponsiveContainer width="100%" height="80%">
                <BarChart data={rechartsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                        {rechartsData.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={index % 2 === 0 ? 'var(--primary)' : 'var(--secondary)'} fillOpacity={0.9} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

