import React, { useState, useEffect, useRef } from 'react';
import api from '../../api/api';

export default function TransactionNotifications({ userRole }) {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(false);
    const [unread, setUnread] = useState(0);
    const dropdownRef = useRef(null);

    // Filter roles
    const allowedRoles = ['OWNER', 'GM', 'SUPER_ADMIN'];
    if (!allowedRoles.includes(userRole)) return null;

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const res = await api.get('/laporan/notifikasi-transaksi');
            if (res.data.success) {
                setNotifications(res.data.data);
                // Simple logic: if dropdown is closed, mark as unread if new data
                if (!isOpen) setUnread(res.data.data.length > 0 ? 1 : 0);
            }
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchNotifications();
        // Polling every 5 minutes for new transactions
        const interval = setInterval(fetchNotifications, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleDropdown = () => {
        setIsOpen(!isOpen);
        if (!isOpen) setUnread(0);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button 
                onClick={toggleDropdown}
                className={`relative w-10 h-10 rounded-2xl border flex items-center justify-center transition-all ${
                    isOpen 
                    ? 'bg-slate-100 border-slate-300 text-slate-800 shadow-inner' 
                    : 'bg-slate-50 border-slate-100 text-slate-400 hover:bg-slate-100 hover:border-slate-300 hover:text-slate-800'
                }`}
                title="Notifikasi Transaksi"
            >
                <span className={`material-symbols-rounded ${unread > 0 ? 'animate-swing' : ''}`}>notifications</span>
                {unread > 0 && (
                    <div className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white shadow-sm"></div>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-3 w-80 md:w-96 bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in zoom-in duration-200 origin-top-right">
                    <div className="p-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                        <div>
                            <h3 className="text-slate-800 font-black text-sm uppercase tracking-tight">Notifikasi Transaksi</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Aktivitas Keuangan Terbaru</p>
                        </div>
                        <button onClick={fetchNotifications} className="p-1.5 hover:bg-white/10 rounded-lg text-emerald-100/50 hover:text-emerald-400 transition-all">
                            <span className={`material-symbols-rounded text-sm ${loading ? 'animate-spin' : ''}`}>refresh</span>
                        </button>
                    </div>

                    <div className="max-h-[450px] overflow-y-auto custom-scrollbar">
                        {notifications.length === 0 ? (
                            <div className="py-12 px-6 text-center">
                                <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4 text-emerald-100/10">
                                    <span className="material-symbols-rounded text-4xl">notifications_off</span>
                                </div>
                                <p className="text-emerald-100/30 text-xs font-bold uppercase tracking-widest">Belum ada transaksi hari ini</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-white/5">
                                {notifications.map((notif) => (
                                    <div key={notif.id} className="p-4 hover:bg-white/5 transition-colors flex gap-4 items-start group">
                                        <div className={`mt-1 w-10 h-10 rounded-2xl flex-shrink-0 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 bg-${notif.color === 'emerald' ? 'emerald-500' : notif.color === 'orange' ? 'orange-500' : notif.color === 'rose' ? 'rose-500' : 'sky-500'}`}>
                                            <span className="material-symbols-rounded text-[20px]">{notif.icon}</span>
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-slate-700 font-semibold leading-relaxed mb-1 group-hover:text-black transition-colors">
                                                {notif.message}
                                            </p>
                                            <p className="text-[9px] font-black text-slate-300 uppercase tracking-tighter group-hover:text-slate-500 transition-colors">
                                                {new Date(notif.tanggal).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} • {new Date(notif.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="p-4 bg-black/20 text-center">
                        <p className="text-[9px] font-bold text-emerald-400/20 uppercase tracking-widest">Sistem Keuangan ANSA Enterprise</p>
                    </div>
                </div>
            )}
        </div>
    );
}
