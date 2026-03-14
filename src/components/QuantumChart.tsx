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

    const rechartsData = Array.isArray(data) ? data : data?.data || [];
    const chartLabel = data?.label || "Quantum Histogram / Probability Distribution";

    return (
        <div className="w-full h-[320px] mt-6 bg-white p-6 rounded-2xl border border-slate-200 animate-in slide-in-from-bottom-4 duration-1000 shadow-sm">
            <h4 className="text-[10px] font-bold text-slate-400 tracking-widest mb-6 border-b border-slate-50 pb-2">{chartLabel}</h4>
            <ResponsiveContainer width="100%" height="80%">
                <BarChart data={rechartsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: '#ffffff',
                            border: '1px solid #f1f5f9',
                            borderRadius: '12px',
                            fontSize: '12px',
                            color: '#334155',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                        }}
                        itemStyle={{ color: '#3066bb', fontWeight: 'bold' }}
                        cursor={{ fill: '#f8fafc' }}
                    />
                    <Bar
                        dataKey="value"
                        radius={[6, 6, 0, 0]}
                    >
                        {rechartsData.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#3066bb' : '#3066bb'} fillOpacity={0.9} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

