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
        axios.get('/api/news/geostatistics')
            .then(res => {
                if (res.data.success) {
                    setStats(res.data.stats);
                }
            })
            .catch(err => console.error("Failed to load map stats", err))
            .finally(() => setLoading(false));
    }, []);

    const getIntensity = (count: number) => {
        const max = Math.max(...stats.map(s => s.count), 1);
        return (count / max);
    };

    const getColor = (countryCode: string) => {
        const stat = stats.find(s => s.countryCode === countryCode);
        if (!stat) return 'fill-muted/20';

        const intensity = getIntensity(stat.count);
        if (intensity > 0.8) return 'fill-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]';
        if (intensity > 0.5) return 'fill-blue-400';
        if (intensity > 0.2) return 'fill-blue-300';
        return 'fill-blue-200';
    };

    // Simplified World Map SVG Paths (Representative major countries for Heat Map)
    // Note: In a production environment, one would use a full geoJSON or react-simple-maps
    const countries = [
        { code: 'USA', name: 'United States', d: "M20,40 L40,40 L40,60 L20,60 Z" }, // Simplified Box
        { code: 'CAN', name: 'Canada', d: "M20,20 L40,20 L40,35 L20,35 Z" },
        { code: 'CHN', name: 'China', d: "M140,45 L165,45 L165,65 L140,65 Z" },
        { code: 'DEU', name: 'Germany', d: "M95,40 L105,40 L105,50 L95,50 Z" },
        { code: 'IND', name: 'India', d: "M135,65 L145,65 L145,80 L135,80 Z" },
        { code: 'GBR', name: 'United Kingdom', d: "M88,38 L93,38 L93,43 L88,43 Z" },
        { code: 'JPN', name: 'Japan', d: "M175,48 L180,48 L180,58 L175,58 Z" },
        { code: 'AUS', name: 'Australia', d: "M160,110 L185,110 L185,130 L160,130 Z" },
        { code: 'RUS', name: 'Russia', d: "M110,20 L170,20 L170,40 L110,40 Z" },
        { code: 'BRA', name: 'Brazil', d: "M55,90 L75,90 L75,120 L55,120 Z" },
    ];

    return (
        <div className="bg-card/30 border border-border rounded-2xl p-6 overflow-hidden relative group">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h4 className="text-sm font-bold flex items-center gap-2">
                        <Globe className="text-blue-500 animate-pulse" size={18} />
                        Global Quantum Intelligence Map
                    </h4>
                    <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-widest">Live News Density by Region</p>
                </div>
                <div className="flex gap-1">
                    {[0.2, 0.5, 0.8, 1.0].map(i => (
                        <div key={i} className="w-2 h-2 rounded-full bg-blue-500" style={{ opacity: i }} />
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="h-64 flex flex-col items-center justify-center space-y-4">
                    <Loader2 className="animate-spin text-blue-500" size={32} />
                    <span className="text-xs font-mono text-muted-foreground animate-pulse">Scanning Global Neural Exports...</span>
                </div>
            ) : (
                <div className="relative h-64 w-full flex items-center justify-center">
                    {/* SVG Map Projection (Minimalist Abstract World) */}
                    <svg viewBox="0 0 200 150" className="w-full h-full max-w-sm drop-shadow-2xl">
                        {/* Background Map Contours */}
                        <path
                            d="M10,30 L190,30 L190,130 L10,130 Z"
                            fill="none"
                            stroke="currentColor"
                            strokeOpacity="0.05"
                            strokeWidth="0.5"
                            strokeDasharray="2 2"
                        />

                        {countries.map(country => {
                            const stat = stats.find(s => s.countryCode === country.code);
                            return (
                                <path
                                    key={country.code}
                                    d={country.d}
                                    className={`transition-all duration-500 cursor-pointer hover:stroke-white hover:stroke-[0.5px] ${getColor(country.code)}`}
                                    onMouseEnter={() => setHoveredCountry(stat || { countryCode: country.code, count: 0, countryName: country.name })}
                                    onMouseLeave={() => setHoveredCountry(null)}
                                />
                            );
                        })}
                    </svg>

                    {/* Information Overlay / Tooltip */}
                    {hoveredCountry && (
                        <div className="absolute bottom-4 left-4 bg-popover/90 backdrop-blur-md border border-border p-3 rounded-xl shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200 z-10">
                            <div className="flex flex-col gap-0.5">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase">{hoveredCountry.countryName}</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-lg font-bold text-foreground">{hoveredCountry.count}</span>
                                    <span className="text-[10px] font-medium text-blue-500">RECENT ARTICLES</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {!hoveredCountry && (
                        <div className="absolute bottom-4 right-4 flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium">
                            <Info size={12} /> Hover over a node
                        </div>
                    )}
                </div>
            )}

            <div className="mt-4 pt-4 border-t border-border/20 grid grid-cols-2 gap-4">
                <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase">Top Hub</span>
                    <span className="text-xs font-semibold">{stats[0]?.countryName || 'Detecting...'}</span>
                </div>
                <div className="flex flex-col text-right">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase">Global Span</span>
                    <span className="text-xs font-semibold">{stats.length} Active Regions</span>
                </div>
            </div>
        </div>
    );
}
