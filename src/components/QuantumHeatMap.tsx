"use client";

import React, { useState, useEffect } from 'react';
import { Globe, Loader2, Info } from 'lucide-react';
import axios from 'axios';

interface Stat {
    countryCode: string;
    count: number;
    countryName: string;
}

export default function QuantumHeatMap() {
    const [stats, setStats] = useState<Stat[]>([]);
    const [loading, setLoading] = useState(true);
    const [hoveredCountry, setHoveredCountry] = useState<Stat | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await axios.get('/api/news/geostatistics');
                if (res.data.success) {
                    setStats(res.data.stats);
                }
            } catch (err) {
                console.error("Map Data Sync Failed:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
        const interval = setInterval(fetchData, 60000); // Sync every minute
        return () => clearInterval(interval);
    }, []);

    const getIntensity = (count: number) => {
        if (stats.length === 0) return 0;
        const max = Math.max(...stats.map(s => s.count), 1);
        return (count / max);
    };

    const getColor = (countryCode: string) => {
        const stat = stats.find(s => s.countryCode === countryCode);
        if (!stat || stat.count === 0) return 'stroke-zinc-800 fill-zinc-900/40 hover:fill-zinc-800/60';

        const intensity = getIntensity(stat.count);
        if (intensity > 0.8) return 'fill-blue-500 stroke-blue-400 animate-pulse drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]';
        if (intensity > 0.5) return 'fill-blue-600 stroke-blue-500';
        if (intensity > 0.2) return 'fill-blue-700 stroke-blue-600';
        return 'fill-blue-800 stroke-blue-700';
    };

    // Organic SVG Shapes for a sophisticated "Global Intelligence" look
    const countries = [
        { code: 'USA', name: 'United States', d: "M30,50 C35,45 45,45 50,50 C55,55 55,65 50,70 C45,75 35,75 30,70 C25,65 25,55 30,50 Z" },
        { code: 'CAN', name: 'Canada', d: "M30,30 C35,25 45,25 50,30 C55,35 55,40 50,45 C45,50 35,50 30,45 C25,40 25,35 30,30 Z" },
        { code: 'CHN', name: 'China', d: "M140,55 C145,50 155,50 160,55 C165,60 165,70 160,75 C155,80 145,80 140,75 C135,70 135,60 140,55 Z" },
        { code: 'DEU', name: 'Germany', d: "M95,45 C98,42 102,42 105,45 C108,48 108,52 105,55 C102,58 98,58 95,55 C92,52 92,48 95,45 Z" },
        { code: 'IND', name: 'India', d: "M130,75 C133,72 137,72 140,75 C143,78 143,85 140,88 C137,91 133,91 130,88 C127,85 127,78 130,75 Z" },
        { code: 'GBR', name: 'UK', d: "M85,40 C87,38 89,38 91,40 C93,42 93,44 91,46 C89,48 87,48 85,46 C83,44 83,42 85,40 Z" },
        { code: 'JPN', name: 'Japan', d: "M175,55 C177,53 179,53 181,55 C183,57 183,61 181,63 C179,65 177,65 175,63 C173,61 173,57 175,55 Z" },
        { code: 'AUS', name: 'Australia', d: "M160,110 C165,105 175,105 180,110 C185,115 185,125 180,130 C175,135 165,135 160,130 C155,125 155,115 160,110 Z" },
        { code: 'RUS', name: 'Russia', d: "M110,30 C125,25 155,25 170,30 C180,35 180,45 170,50 C155,55 125,55 110,50 C100,45 100,35 110,30 Z" },
        { code: 'BRA', name: 'Brazil', d: "M60,95 C65,90 75,90 80,95 C85,100 85,115 80,120 C75,125 65,125 60,120 C55,115 55,100 60,95 Z" },
    ];

    return (
        <div className="bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl border border-border/50 rounded-2xl p-6 overflow-hidden relative group shadow-2xl">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h4 className="text-sm font-bold flex items-center gap-2 text-foreground tracking-tight">
                        <Globe className="text-blue-500 animate-[spin_15s_linear_infinite]" size={18} />
                        Quantum Intelligence Map
                    </h4>
                    <p className="text-[9px] text-muted-foreground/60 mt-1 uppercase tracking-[0.2em] font-mono">Global Frequency Scan</p>
                </div>
                <div className="flex gap-1.5 items-center bg-black/20 px-2 py-1 rounded-full border border-white/5">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                    <span className="text-[8px] font-bold text-blue-400 uppercase tracking-tighter">Live</span>
                </div>
            </div>

            {loading ? (
                <div className="h-64 flex flex-col items-center justify-center space-y-4">
                    <Loader2 className="animate-spin text-blue-500/40" size={32} />
                    <span className="text-[10px] font-mono text-muted-foreground/40 animate-pulse tracking-[0.3em] uppercase">Syncing Neural Nodes...</span>
                </div>
            ) : (
                <div className="relative h-64 w-full flex items-center justify-center">
                    {/* SVG Map Projection */}
                    <svg viewBox="0 0 200 150" className="w-full h-full max-w-[340px] drop-shadow-2xl transition-all duration-700 hover:scale-[1.03]">
                        <defs>
                            <filter id="glow">
                                <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
                                <feMerge>
                                    <feMergeNode in="coloredBlur" />
                                    <feMergeNode in="SourceGraphic" />
                                </feMerge>
                            </filter>
                        </defs>

                        {/* Equatorial Grid */}
                        <path
                            d="M0,75 L200,75 M100,0 L100,150"
                            stroke="currentColor"
                            strokeOpacity="0.03"
                            strokeWidth="0.5"
                        />

                        {countries.map(country => {
                            const stat = stats.find(s => s.countryCode === country.code);
                            return (
                                <path
                                    key={country.code}
                                    d={country.d}
                                    strokeWidth="0.8"
                                    className={`transition-all duration-700 cursor-pointer hover:stroke-white hover:z-10 ${getColor(country.code)}`}
                                    onMouseEnter={() => setHoveredCountry(stat || { countryCode: country.code, count: 0, countryName: country.name })}
                                    onMouseLeave={() => setHoveredCountry(null)}
                                />
                            );
                        })}
                    </svg>

                    {/* Tooltip */}
                    {hoveredCountry && (
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-popover/95 backdrop-blur-md border border-white/10 p-3 rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.5)] z-20 pointer-events-none animate-in fade-in zoom-in-95 duration-200">
                            <div className="flex flex-col gap-1 text-center min-w-[100px]">
                                <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest">{hoveredCountry.countryName}</span>
                                <div className="flex items-center justify-center gap-2">
                                    <span className="text-2xl font-black text-foreground">{hoveredCountry.count}</span>
                                    <div className="flex flex-col items-start leading-none">
                                        <span className="text-[8px] font-bold text-blue-400">SIGNALS</span>
                                        <span className="text-[8px] font-bold text-muted-foreground">SCANNING</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {!hoveredCountry && (
                        <div className="absolute bottom-2 inset-x-0 flex justify-center">
                            <div className="flex items-center gap-1.5 text-[8px] text-muted-foreground/40 font-bold uppercase tracking-widest bg-black/10 px-3 py-1 rounded-full">
                                <Info size={10} /> Orbit cursor to inspect nodes
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="mt-8 pt-6 border-t border-white/5 grid grid-cols-2 gap-4">
                <div className="group/hub">
                    <span className="text-[9px] font-black text-muted-foreground/50 uppercase tracking-widest block mb-1">Primary Hub</span>
                    <span className="text-xs font-bold text-foreground group-hover/hub:text-blue-400 transition-colors uppercase">
                        {stats[0]?.countryName || 'Searching...'}
                    </span>
                </div>
                <div className="text-right">
                    <span className="text-[9px] font-black text-muted-foreground/50 uppercase tracking-widest block mb-1">Global Reach</span>
                    <span className="text-xs font-bold text-foreground uppercase">
                        {stats.length} Active Vectors
                    </span>
                </div>
            </div>
        </div>
    );
}
