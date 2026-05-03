import React, { useState, useRef, useEffect } from 'react';
import api from '../../api/api';

const AIExecutiveAssistant = ({ userRole }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { 
            role: 'assistant', 
            text: 'Halo Bos! Saya Asisten Eksekutif Anda. Ada yang bisa saya bantu cek dari data pabrik hari ini?',
            timestamp: new Date()
        }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef(null);

    // Filter akses: Hanya Owner, GM, dan Super Admin
    const allowedRoles = ['owner', 'gm', 'super_admin', 'bos'];
    if (!allowedRoles.includes(userRole)) return null;

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        const userMsg = { role: 'user', text: input, timestamp: new Date() };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            const res = await api.post('/ai/tanya', { prompt: input });
            
            if (res.data.status === 'success') {
                const assistantMsg = { 
                    role: 'assistant', 
                    text: res.data.jawaban_teks, 
                    table: res.data.data_tabel,
                    timestamp: new Date() 
                };
                setMessages(prev => [...prev, assistantMsg]);
            } else {
                setMessages(prev => [...prev, { 
                    role: 'assistant', 
                    text: 'Maaf Bos, sepertinya ada kendala teknis: ' + res.data.message,
                    timestamp: new Date() 
                }]);
            }
        } catch (err) {
            setMessages(prev => [...prev, { 
                role: 'assistant', 
                text: 'Maaf Bos, koneksi ke server AI terputus.',
                timestamp: new Date() 
            }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-24 z-[9999] flex flex-col items-end gap-4">
            {/* Chat Window */}
            {isOpen && (
                <div className="w-[380px] md:w-[450px] h-[600px] bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-10 duration-500">
                    {/* Header */}
                    <div className="p-6 bg-gradient-to-r from-slate-900 to-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                                <span className="material-symbols-rounded text-white">smart_toy</span>
                            </div>
                            <div>
                                <h2 className="text-sm font-black text-white tracking-tight uppercase">AI Executive Assistant</h2>
                                <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">Real-Time Data Insights</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => setIsOpen(false)}
                            className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors"
                        >
                            <span className="material-symbols-rounded">close</span>
                        </button>
                    </div>

                    {/* Chat Area */}
                    <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 bg-slate-50 space-y-4 custom-scrollbar">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                    <div className={`p-4 rounded-[1.5rem] text-sm leading-relaxed shadow-sm ${
                                        msg.role === 'user' 
                                        ? 'bg-emerald-600 text-white rounded-tr-none' 
                                        : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
                                    }`}>
                                        {msg.text}
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
                                    <span className="text-[9px] text-slate-400 font-bold uppercase">
                                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-white p-4 rounded-[1.5rem] rounded-tl-none border border-slate-100 flex gap-1">
                                    <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce"></div>
                                    <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                                    <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Input Area */}
                    <form onSubmit={handleSend} className="p-6 bg-white border-t border-slate-100 flex gap-3 items-center">
                        <input 
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Tanya omset, stok, atau hutang..."
                            className="flex-1 bg-slate-50 border-none rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-emerald-500/20 transition-all placeholder:text-slate-400 font-medium"
                        />
                        <button 
                            type="submit"
                            disabled={loading || !input.trim()}
                            className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/30 hover:bg-slate-900 transition-all disabled:opacity-50 disabled:shadow-none active:scale-95"
                        >
                            <span className="material-symbols-rounded">send</span>
                        </button>
                    </form>
                </div>
            )}

            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`group relative flex items-center justify-center w-16 h-16 rounded-full transition-all duration-500 ${
                    isOpen 
                    ? 'bg-slate-900 border border-slate-700' 
                    : 'bg-white shadow-[0_10px_30px_rgba(0,0,0,0.1)] hover:scale-110 border border-slate-100'
                }`}
            >
                {!isOpen && (
                    <>
                        <span className="material-symbols-rounded text-slate-700 text-3xl group-hover:text-emerald-500 transition-colors">chat_bubble</span>
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 border-2 border-white rounded-full flex items-center justify-center">
                            <span className="material-symbols-rounded text-white text-[12px] animate-pulse">sparkles</span>
                        </div>
                    </>
                )}
                {isOpen && (
                    <span className="material-symbols-rounded text-white text-3xl">close</span>
                )}
                
                {/* Tooltip */}
                {!isOpen && (
                    <div className="absolute right-20 bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl border border-white/10 translate-x-2 group-hover:translate-x-0 duration-300">
                        Tanya Asisten AI
                        <div className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-2 bg-slate-900 rotate-45 border-t border-r border-white/10"></div>
                    </div>
                )}
            </button>
        </div>
    );
};

export default AIExecutiveAssistant;
