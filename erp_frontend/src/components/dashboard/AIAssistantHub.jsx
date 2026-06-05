import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import api from '../../api/api';

const AIAssistantHub = ({ userRole }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('chat'); // 'chat' or 'analysis'
    
    // --- CHAT STATE ---
    const [messages, setMessages] = useState([
        { 
            role: 'assistant', 
            text: 'Halo Bos! Saya Asisten Eksekutif Anda. Ada yang bisa saya bantu cek dari data pabrik hari ini?',
            timestamp: new Date()
        }
    ]);
    const [chatInput, setChatInput] = useState('');
    const [chatLoading, setChatLoading] = useState(false);
    const scrollRef = useRef(null);

    // --- ANALYSIS STATE ---
    const [analysisLoading, setAnalysisLoading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState(null);
    const [analysisError, setAnalysisError] = useState(null);

    // Filter akses: Hanya Owner, GM, Super Admin, dan Bos
    const allowedRoles = ['owner', 'gm', 'super_admin', 'bos'];
    if (!allowedRoles.includes(userRole)) return null;

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, activeTab]);

    // --- CHAT LOGIC ---
    const handleSendChat = async (e) => {
        e.preventDefault();
        if (!chatInput.trim() || chatLoading) return;

        const userMsg = { role: 'user', text: chatInput, timestamp: new Date() };
        setMessages(prev => [...prev, userMsg]);
        setChatInput('');
        setChatLoading(true);

        try {
            const res = await api.post('/ai/tanya', { prompt: chatInput });
            if (res.data.status === 'success') {
                setMessages(prev => [...prev, { 
                    role: 'assistant', 
                    text: res.data.jawaban_teks, 
                    table: res.data.data_tabel,
                    timestamp: new Date() 
                }]);
            } else {
                setMessages(prev => [...prev, { role: 'assistant', text: 'Gagal: ' + res.data.message, timestamp: new Date() }]);
            }
        } catch (err) {
            setMessages(prev => [...prev, { role: 'assistant', text: 'Koneksi terputus.', timestamp: new Date() }]);
        } finally {
            setChatLoading(false);
        }
    };

    // --- ANALYSIS LOGIC ---
    const runAnalysis = async () => {
        setAnalysisLoading(true);
        setAnalysisError(null);
        try {
            const res = await api.get('/ai/financial-health');
            if (res.data.status === 'success') {
                setAnalysisResult(res.data.analysis);
            } else {
                setAnalysisError(res.data.message);
            }
        } catch (err) {
            setAnalysisError("Koneksi ke server AI terputus.");
        } finally {
            setAnalysisLoading(false);
        }
    };

    return (
        <div className="fixed bottom-24 md:bottom-6 right-6 z-[9999] flex flex-col items-end gap-4 font-inter">
            {/* Unified AI Window */}
            {isOpen && (
                <div className="w-[calc(100vw-2rem)] sm:w-[380px] md:w-[480px] h-[70vh] sm:h-[650px] bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-10 duration-500">
                    {/* Header with Navigation */}
                    <div className="bg-slate-900 p-6 pb-2">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/40">
                                    <span className="material-symbols-rounded text-white">psychology</span>
                                </div>
                                <div>
                                    <h2 className="text-sm font-black text-white tracking-tight uppercase">AI Business Intelligence</h2>
                                    <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">Ansa-Enterprise Assistant</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setIsOpen(false)}
                                className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors"
                            >
                                <span className="material-symbols-rounded text-lg">close</span>
                            </button>
                        </div>
                        
                        {/* Tabs */}
                        <div className="flex gap-2 p-1 bg-white/5 rounded-2xl">
                            <button 
                                onClick={() => setActiveTab('chat')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                    activeTab === 'chat' 
                                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                <span className="material-symbols-rounded text-sm">chat_bubble</span>
                                Executive Chat
                            </button>
                            <button 
                                onClick={() => setActiveTab('analysis')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                    activeTab === 'analysis' 
                                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                <span className="material-symbols-rounded text-sm">monitoring</span>
                                Health Analysis
                            </button>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-hidden bg-slate-50 relative flex flex-col">
                        {activeTab === 'chat' ? (
                            <>
                                <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                                    {messages.map((msg, idx) => (
                                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[85%] flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                                <div className={`p-4 rounded-[1.5rem] text-sm leading-relaxed shadow-sm ${
                                                    msg.role === 'user' 
                                                    ? 'bg-emerald-600 text-white rounded-tr-none' 
                                                    : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none prose prose-sm max-w-none prose-p:leading-relaxed prose-p:my-1 prose-strong:text-emerald-700'
                                                }`}>
                                                    {msg.role === 'assistant' ? (
                                                        <ReactMarkdown>{msg.text}</ReactMarkdown>
                                                    ) : (
                                                        msg.text
                                                    )}
                                                </div>
                                                
                                                {msg.table && msg.table.length > 0 && (
                                                    <div className="w-full bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm mt-2">
                                                        <div className="overflow-x-auto">
                                                            <table className="w-full text-[10px] text-left">
                                                                <thead className="bg-slate-50 text-slate-400 uppercase font-bold tracking-widest border-b border-slate-100">
                                                                    <tr>
                                                                        {Object.keys(msg.table[0]).map(key => (
                                                                            <th key={key} className="px-3 py-2">{key}</th>
                                                                        ))}
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-slate-50">
                                                                    {msg.table.map((row, i) => (
                                                                        <tr key={i} className="hover:bg-slate-50 transition-colors">
                                                                            {Object.values(row).map((val, j) => (
                                                                                <td key={j} className="px-3 py-2 font-medium text-slate-600">{val}</td>
                                                                            ))}
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {chatLoading && (
                                        <div className="flex justify-start">
                                            <div className="bg-white p-4 rounded-[1.5rem] rounded-tl-none border border-slate-100 flex gap-1">
                                                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce"></div>
                                                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                                                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <form onSubmit={handleSendChat} className="p-6 bg-white border-t border-slate-100 flex gap-3 items-center">
                                    <input 
                                        type="text"
                                        value={chatInput}
                                        onChange={(e) => setChatInput(e.target.value)}
                                        placeholder="Tanya omset, stok, atau hutang..."
                                        className="flex-1 bg-slate-50 border-none rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-emerald-500/20 transition-all placeholder:text-slate-400 font-medium"
                                    />
                                    <button 
                                        type="submit"
                                        disabled={chatLoading || !chatInput.trim()}
                                        className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/30 hover:bg-slate-900 transition-all active:scale-95 disabled:opacity-50"
                                    >
                                        <span className="material-symbols-rounded">send</span>
                                    </button>
                                </form>
                            </>
                        ) : (
                            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                                {!analysisResult && !analysisLoading && !analysisError && (
                                    <div className="py-12 text-center h-full flex flex-col items-center justify-center">
                                        <div className="w-20 h-20 bg-emerald-500/10 rounded-[2rem] flex items-center justify-center mb-6 border border-emerald-500/20 shadow-inner">
                                            <span className="material-symbols-rounded text-emerald-500 text-4xl animate-pulse">auto_awesome</span>
                                        </div>
                                        <h3 className="text-slate-800 font-black text-lg mb-2">Audit Keuangan Strategis</h3>
                                        <p className="text-slate-400 text-xs px-12 mb-8 leading-relaxed">Analisis mendalam terhadap Buku Besar, Neraca, dan Arus Kas untuk menemukan wawasan bisnis hari ini.</p>
                                        <button 
                                            onClick={runAnalysis}
                                            className="bg-emerald-500 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-900 transition-all shadow-xl shadow-emerald-500/20 active:scale-95 flex items-center gap-3"
                                        >
                                            <span className="material-symbols-rounded">play_arrow</span>
                                            Mulai Analisis Sekarang
                                        </button>
                                    </div>
                                )}

                                {analysisLoading && (
                                    <div className="py-20 flex flex-col items-center justify-center h-full">
                                        <div className="relative w-16 h-16 mb-8">
                                            <div className="absolute inset-0 border-4 border-emerald-500/10 rounded-full"></div>
                                            <div className="absolute inset-0 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                                        </div>
                                        <p className="text-emerald-600 font-black text-[10px] uppercase tracking-[0.3em] text-center px-12">
                                            AI sedang membaca Buku Besar & Menghitung Neraca...
                                        </p>
                                    </div>
                                )}

                                {analysisError && (
                                    <div className="p-6 bg-red-50 border border-red-100 rounded-3xl flex items-start gap-4">
                                        <span className="material-symbols-rounded text-red-500 text-2xl">warning</span>
                                        <p className="text-red-700 text-xs font-bold leading-relaxed">{analysisError}</p>
                                    </div>
                                )}

                                {analysisResult && (
                                    <div className="prose prose-emerald max-w-none prose-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
                                        <ReactMarkdown 
                                            components={{
                                                h1: ({node, ...props}) => <h1 className="text-base font-black text-slate-900 mb-2 mt-4 uppercase tracking-tight border-b border-slate-100 pb-2" {...props} />,
                                                h2: ({node, ...props}) => <h2 className="text-sm font-black text-emerald-600 mb-1 mt-6 uppercase" {...props} />,
                                                h3: ({node, ...props}) => <h3 className="text-xs font-bold text-slate-800 mb-1 mt-4" {...props} />,
                                                p: ({node, ...props}) => <p className="text-slate-600 text-[11px] leading-relaxed mb-4" {...props} />,
                                                li: ({node, ...props}) => <li className="text-slate-600 text-[11px] mb-1" {...props} />,
                                                ul: ({node, ...props}) => <ul className="list-disc pl-4 mb-4" {...props} />,
                                            }}
                                        >
                                            {analysisResult}
                                        </ReactMarkdown>
                                        <button 
                                            onClick={() => setAnalysisResult(null)}
                                            className="mt-8 w-full py-4 rounded-2xl border border-slate-200 text-slate-400 font-bold text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                                        >
                                            <span className="material-symbols-rounded text-sm">refresh</span>
                                            Ulangi Analisis
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`group relative flex items-center justify-center w-16 h-16 rounded-full transition-all duration-500 ${
                    isOpen 
                    ? 'bg-slate-900 border border-slate-700' 
                    : 'bg-emerald-500 shadow-[0_10px_30px_rgba(16,185,129,0.3)] hover:scale-110 hover:shadow-[0_15px_40px_rgba(16,185,129,0.5)]'
                }`}
            >
                {!isOpen && (
                    <>
                        <div className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-20"></div>
                        <span className="material-symbols-rounded text-white text-3xl group-hover:rotate-12 transition-transform">psychology</span>
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 border-2 border-white rounded-full flex items-center justify-center">
                            <span className="text-[9px] text-white font-black">AI</span>
                        </div>
                    </>
                )}
                {isOpen && (
                    <span className="material-symbols-rounded text-white text-3xl">close</span>
                )}
                
                {/* Tooltip */}
                {!isOpen && (
                    <div className="absolute right-20 bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl border border-white/10 translate-x-2 group-hover:translate-x-0 duration-300">
                        AI Business Assistant
                        <div className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-2 bg-slate-900 rotate-45 border-t border-r border-white/10"></div>
                    </div>
                )}
            </button>
        </div>
    );
};

export default AIAssistantHub;
