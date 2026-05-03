import React, { useState } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';

const AIFinancialAnalyzer = ({ userRole }) => {
    const [loading, setLoading] = useState(false);
    const [analysis, setAnalysis] = useState(null);
    const [error, setError] = useState(null);
    const [isExpanded, setIsExpanded] = useState(false);

    // Filter hak akses: Hanya Owner, GM, dan Super Admin
    const allowedRoles = ['owner', 'gm', 'super_admin'];
    if (!allowedRoles.includes(userRole)) return null;

    const runAnalysis = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL || ''}/api/ai/financial-health`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            
            if (res.data.status === 'success') {
                setAnalysis(res.data.analysis);
            } else if (res.data.status === 'warning') {
                setError(res.data.message);
            } else if (res.data.status === 'error') {
                setError(res.data.message);
            } else {
                setError("Gagal mendapatkan analisis AI.");
            }
        } catch (err) {
            setError("Koneksi ke server AI terputus.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-4">
            {/* Analisis Window */}
            {isExpanded && (
                <div className="w-[350px] md:w-[450px] max-h-[80vh] bg-slate-900/95 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl border border-emerald-500/30 overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-10 duration-500">
                    {/* Header */}
                    <div className="p-6 bg-gradient-to-r from-emerald-600/20 to-transparent border-b border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/40">
                                <span className="material-symbols-rounded text-white text-xl">psychology</span>
                            </div>
                            <div>
                                <h2 className="text-sm font-black text-white tracking-tight uppercase">AI Financial Health</h2>
                                <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">Virtual CFO Assistant</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => setIsExpanded(false)}
                            className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors"
                        >
                            <span className="material-symbols-rounded">close</span>
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                        {!analysis && !loading && !error && (
                            <div className="py-8 text-center">
                                <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
                                    <span className="material-symbols-rounded text-emerald-400 text-3xl animate-pulse">auto_awesome</span>
                                </div>
                                <h3 className="text-white font-bold mb-2">Siap Menganalisis?</h3>
                                <p className="text-slate-400 text-xs px-6 mb-6">AI akan memproses seluruh data keuangan Anda untuk memberikan insight strategis.</p>
                                <button 
                                    onClick={runAnalysis}
                                    className="bg-emerald-500 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-white hover:text-emerald-900 transition-all shadow-xl shadow-emerald-500/20 active:scale-95 flex items-center gap-2 mx-auto"
                                >
                                    <span className="material-symbols-rounded text-sm">play_arrow</span>
                                    Mulai Analisis
                                </button>
                            </div>
                        )}

                        {loading && (
                            <div className="py-12 flex flex-col items-center justify-center">
                                <div className="relative w-16 h-16 mb-6">
                                    <div className="absolute inset-0 border-4 border-emerald-500/10 rounded-full"></div>
                                    <div className="absolute inset-0 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                                </div>
                                <p className="text-emerald-400 font-bold text-[10px] uppercase tracking-[0.2em] text-center px-4">
                                    AI sedang membaca Buku Besar & Menghitung Neraca...
                                </p>
                            </div>
                        )}

                        {error && (
                            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3">
                                <span className="material-symbols-rounded text-red-500 text-xl">warning</span>
                                <p className="text-red-200 text-xs font-medium leading-relaxed">{error}</p>
                            </div>
                        )}

                        {analysis && (
                            <div className="prose prose-invert prose-emerald max-w-none prose-sm">
                                <ReactMarkdown 
                                    components={{
                                        h1: ({node, ...props}) => <h1 className="text-base font-black text-emerald-400 mb-2 mt-4 uppercase tracking-tight" {...props} />,
                                        h2: ({node, ...props}) => <h2 className="text-sm font-black text-emerald-300 mb-1 mt-3 uppercase" {...props} />,
                                        h3: ({node, ...props}) => <h3 className="text-xs font-bold text-white mb-1 mt-2" {...props} />,
                                        p: ({node, ...props}) => <p className="text-slate-300 text-[11px] leading-relaxed mb-3" {...props} />,
                                        li: ({node, ...props}) => <li className="text-slate-300 text-[11px] mb-1" {...props} />,
                                        ul: ({node, ...props}) => <ul className="list-disc pl-4 mb-3" {...props} />,
                                    }}
                                >
                                    {analysis}
                                </ReactMarkdown>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    {analysis && (
                        <div className="p-4 border-t border-white/5 bg-white/5 backdrop-blur-md">
                            <button 
                                onClick={() => setAnalysis(null)}
                                className="w-full py-3 rounded-xl border border-emerald-500/20 text-emerald-400 font-bold text-[10px] uppercase tracking-widest hover:bg-emerald-500/10 transition-all flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-rounded text-sm">refresh</span>
                                Refresh Analisis
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Trigger Button */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className={`group relative flex items-center justify-center w-16 h-16 rounded-full transition-all duration-500 ${
                    isExpanded 
                    ? 'bg-slate-900 border border-emerald-500/50 rotate-90' 
                    : 'bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:scale-110 hover:shadow-[0_0_30px_rgba(16,185,129,0.6)]'
                }`}
            >
                {!isExpanded && (
                    <>
                        <div className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-20"></div>
                        <span className="material-symbols-rounded text-white text-3xl group-hover:rotate-12 transition-transform">psychology</span>
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 border-2 border-white rounded-full flex items-center justify-center">
                            <span className="text-[10px] text-white font-black">AI</span>
                        </div>
                    </>
                )}
                {isExpanded && (
                    <span className="material-symbols-rounded text-emerald-500 text-3xl">keyboard_arrow_down</span>
                )}
                
                {/* Tooltip */}
                {!isExpanded && (
                    <div className="absolute right-20 bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl border border-white/10 translate-x-2 group-hover:translate-x-0 duration-300">
                        AI Financial Analyzer
                        <div className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-2 bg-slate-900 rotate-45 border-t border-r border-white/10"></div>
                    </div>
                )}
            </button>
        </div>
    );
};

export default AIFinancialAnalyzer;
