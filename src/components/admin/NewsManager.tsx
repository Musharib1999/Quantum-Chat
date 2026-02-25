"use client";

import React, { useState, useEffect } from 'react';
import { Newspaper, Loader2, RefreshCw, Trash, ExternalLink, Activity } from 'lucide-react';
import axios from 'axios';
import { useTheme } from '@/components/ThemeContext';

interface NewsItem {
    _id: string;
    title: string;
    source: string;
    url: string;
    publishedAt: string;
    impact: 'high' | 'medium' | 'low';
    trend: 'up' | 'down';
    createdAt: string;
}

export default function NewsManager() {
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';

    const [news, setNews] = useState<NewsItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isScraping, setIsScraping] = useState(false);
    const [scrapeStatus, setScrapeStatus] = useState<{ message: string; type: 'success' | 'error' | null }>({ message: '', type: null });

    useEffect(() => {
        fetchNews();
    }, []);

    const fetchNews = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/news');
            setNews(res.data);
        } catch (error) {
            console.error('Failed to fetch news', error);
        } finally {
            setLoading(false);
        }
    };

    const handleScrape = async () => {
        setIsScraping(true);
        setScrapeStatus({ message: 'Scraping live data from Python backend...', type: null });
        try {
            const res = await axios.post('/api/admin/scrape');
            if (res.data.success) {
                setScrapeStatus({ message: res.data.message, type: 'success' });
                await fetchNews(); // Refresh the list
            } else {
                setScrapeStatus({ message: 'Scraping failed.', type: 'error' });
            }
        } catch (error: any) {
            setScrapeStatus({ message: error.response?.data?.error || 'Failed to trigger scraper', type: 'error' });
        } finally {
            setIsScraping(false);
            // Clear success message after 5 seconds
            setTimeout(() => {
                setScrapeStatus(prev => prev.type === 'success' ? { message: '', type: null } : prev);
            }, 5000);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await axios.delete(`/api/news?id=${id}`);
            setNews(news.filter(n => n._id !== id));
        } catch (error) {
            console.error('Failed to delete news', error);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className={`text-xl font-semibold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        <Newspaper className="text-[#3066bb]" size={24} /> News Integration
                    </h2>
                    <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Manage automated news scraping from Google News.</p>
                </div>

                <button
                    onClick={handleScrape}
                    disabled={isScraping}
                    className="bg-[#3066bb] hover:bg-[#255299] text-white px-4 py-2 rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all shadow-sm"
                >
                    {isScraping ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                    {isScraping ? 'Scraping...' : 'Run Scraper Now'}
                </button>
            </div>

            {scrapeStatus.message && (
                <div className={`p-4 rounded-lg border text-sm flex items-center gap-2 ${scrapeStatus.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-green-500/10 border-green-500/20 text-green-400'}`}>
                    <Activity size={16} /> {scrapeStatus.message}
                </div>
            )}

            {/* List */}
            {loading ? (
                <div className="flex justify-center p-12"><Loader2 className={`animate-spin w-8 h-8 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} /></div>
            ) : (
                <div className={`rounded-xl border overflow-hidden ${isDarkMode ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`}>
                    <table className={`w-full text-left text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                        <thead className={isDarkMode ? 'bg-slate-800 text-slate-100' : 'bg-slate-50 text-slate-900'}>
                            <tr>
                                <th className="px-5 py-4 font-medium">Headline & Source</th>
                                <th className="px-5 py-4 font-medium w-32">Indicators</th>
                                <th className="px-5 py-4 font-medium text-right w-24">Actions</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-slate-200'}`}>
                            {news.map((item) => (
                                <tr key={item._id} className={`group transition-colors ${isDarkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}`}>
                                    <td className="px-5 py-4">
                                        <div className={`font-medium line-clamp-2 ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{item.title}</div>
                                        <div className={`flex items-center gap-3 mt-1.5 text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                            <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>{item.source}</span>
                                            <span>•</span>
                                            <span>{new Date(item.publishedAt || item.createdAt).toLocaleDateString()}</span>
                                            <a href={item.url} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-1 ml-auto opacity-0 group-hover:opacity-100 transition-opacity ${isDarkMode ? 'text-[#3066bb] hover:text-[#255299]' : 'text-[#3066bb] hover:text-[#255299]'}`}>
                                                Read <ExternalLink size={10} />
                                            </a>
                                        </div>
                                    </td>
                                    <td className="px-5 py-4 align-top">
                                        <div className="flex flex-col gap-1.5">
                                            <span className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] w-fit font-medium ${item.trend === 'up' ? 'bg-green-500/20 text-green-500 border border-green-500/20' : 'bg-red-500/20 text-red-500 border border-red-500/20'}`}>
                                                {item.trend === 'up' ? 'UPTREND ▲' : 'DOWNTREND ▼'}
                                            </span>
                                            <span className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] w-fit font-medium ${item.impact === 'high' ? 'bg-orange-500/20 text-orange-500 border border-orange-500/20' : 'bg-slate-500/20 text-slate-500 border border-slate-500/20'}`}>
                                                {item.impact.toUpperCase()} IMPACT
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-5 py-4 text-right align-top">
                                        <button onClick={() => handleDelete(item._id)} className="text-red-500 hover:text-red-400 p-1.5 hover:bg-red-500/10 rounded-md transition-colors opacity-0 group-hover:opacity-100">
                                            <Trash size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {news.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="px-5 py-12 text-center text-slate-500">
                                        No news articles yet. Click "Run Scraper Now" to fetch live data.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
