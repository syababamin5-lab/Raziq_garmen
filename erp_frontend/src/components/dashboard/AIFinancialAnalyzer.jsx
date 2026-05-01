import React, { useState } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';

const AIFinancialAnalyzer = ({ userRole }) => {
    const [loading, setLoading] = useState(false);
    const [analysis, setAnalysis] = useState(null);
    const [error, setError] = useState(null);

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
                console.log("Snapshot Data:", res.data.raw_data);
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
        <div className="bg-gradient-to-br from-slate-900 to-emerald-950 rounded-[2.5rem] p-8 shadow-2xl border border-emerald-500/20 relative overflow-hidden group">
            {/* Animasi Background */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full -mr-20 -mt-20 animate-pulse"></div>
            
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/50">
                            <span className="material-symbols-rounded text-white">psychology</span>
                        </div>
                        <h2 className="text-xl font-black text-white tracking-tight uppercase">AI Financial Health Analyzer</h2>
                    </div>
                    <p className="text-emerald-100/60 text-sm font-medium italic">Asisten CFO Virtual: Analisis kesehatan keuangan berbasis AI secara Real-Time.</p>
                </div>

                {!analysis && !loading && (
                    <button 
                        onClick={runAnalysis}
                        className="bg-emerald-500 text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-white hover:text-emerald-900 transition-all shadow-xl shadow-emerald-500/20 active:scale-95 flex items-center gap-3 group"
                    >
                        <span className="material-symbols-rounded animate-spin-slow">auto_awesome</span>
                        Mulai Analisis Strategis
                    </button>
                )}
            </div>

            {loading && (
                <div className="mt-12 flex flex-col items-center justify-center py-10">
                    <div className="relative w-20 h-20">
                        <div className="absolute inset-0 border-4 border-emerald-500/20 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                    <p className="mt-6 text-emerald-400 font-black animate-pulse text-sm uppercase tracking-widest">AI sedang membaca Buku Besar & Menghitung Neraca...</p>
                </div>
            )}

            {error && (
                <div className="mt-8 p-6 bg-red-500/10 border border-red-500/20 rounded-3xl flex items-center gap-4">
                    <span className="material-symbols-rounded text-red-500 text-3xl">warning</span>
                    <p className="text-red-200 text-sm font-bold">{error}</p>
                </div>
            )}

            {analysis && (
                <div className="mt-8 space-y-6">
                    <div className="p-8 bg-white/5 backdrop-blur-xl rounded-[2rem] border border-white/10 text-emerald-50 shadow-inner overflow-hidden relative">
                        <div className="prose prose-invert prose-emerald max-w-none prose-sm">
                            <ReactMarkdown>{analysis}</ReactMarkdown>
                        </div>
                        
                        <button 
                            onClick={() => setAnalysis(null)}
                            className="mt-8 text-xs font-black text-emerald-500 uppercase tracking-widest hover:text-white transition-all flex items-center gap-2"
                        >
                            <span className="material-symbols-rounded text-sm">refresh</span>
                            Tutup & Analisis Ulang
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AIFinancialAnalyzer;
