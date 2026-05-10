import React from 'react';

const SubscriptionModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    const packages = [
        {
            name: "UMKM LITE",
            price: "Rp 349.000",
            period: "/ Bulan",
            color: "from-blue-600 to-blue-400",
            bg: "bg-blue-50",
            text: "text-blue-700",
            features: ["Dashboard Ringkasan", "Master Data Produk", "Stok Kain & Baju", "Penjualan Tunai", "Beli Bahan Tunai"],
            icon: "storefront"
        },
        {
            name: "SMART FACTORY",
            price: "Rp 999.000",
            period: "/ Bulan",
            color: "from-emerald-600 to-emerald-400",
            bg: "bg-emerald-50",
            text: "text-emerald-700",
            features: ["Semua Fitur Paket 1", "Modul Produksi (Web)", "WIP Monitoring", "Hutang & Piutang", "Payroll Borongan"],
            icon: "precision_manufacturing"
        },
        {
            name: "ENTERPRISE PRO",
            price: "Rp 1.990.000",
            period: "/ Bulan",
            color: "from-purple-600 to-purple-400",
            bg: "bg-purple-50",
            text: "text-purple-700",
            features: ["Semua Fitur Paket 2", "Akuntansi Full IFRS", "Manajemen Aset Tetap", "Custom Branding PDF", "Multi-Account Bank"],
            icon: "corporate_fare"
        },
        {
            name: "ULTIMATE AI",
            price: "Rp 3.999.000",
            period: "/ Bulan",
            color: "from-slate-900 to-slate-700",
            bg: "bg-slate-100",
            text: "text-slate-900",
            features: ["Semua Fitur Paket 3", "MOBILE APP EXCLUSIVE", "AI Financial Auditor", "Production Forecast", "Priority Support"],
            icon: "psychology",
            isPremium: true
        }
    ];

    const handleWhatsApp = () => {
        const message = encodeURIComponent("Halo Admin ANSA Enterprise, saya tertarik untuk berlangganan Paket ERP Raziq Garmen.");
        window.open(`https://wa.me/6281214914641?text=${message}`, '_blank');
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 slide-in-from-bottom-8 duration-500">
                
                {/* Header */}
                <div className="p-8 md:p-12 text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-emerald-50 via-white to-transparent opacity-60"></div>
                    <div className="relative z-10">
                        <div className="inline-block px-4 py-1.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-[0.3em] mb-4">Subscription Plan</div>
                        <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter mb-4">Pilih Paket <span className="text-emerald-600">Terbaik</span> Anda</h2>
                        <p className="text-slate-500 font-medium max-w-2xl mx-auto text-sm md:text-base italic">Tingkatkan efisiensi pabrik garmen Anda dengan fitur manajemen produksi & keuangan terintegrasi.</p>
                    </div>
                </div>

                {/* Grid Packages */}
                <div className="flex-1 overflow-y-auto px-8 md:px-12 pb-12 custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {packages.map((pkg, i) => (
                            <div key={i} className={`relative flex flex-col rounded-[2.5rem] p-8 border-2 transition-all duration-300 hover:scale-[1.02] ${pkg.isPremium ? 'border-slate-900 bg-slate-900 text-white shadow-2xl' : 'border-slate-100 bg-white hover:border-emerald-200 shadow-xl'}`}>
                                {pkg.isPremium && (
                                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-yellow-400 to-amber-600 text-white text-[9px] font-black px-4 py-1.5 rounded-full shadow-lg flex items-center gap-2">
                                        <span className="material-symbols-rounded text-xs">grade</span>
                                        MOST EXCLUSIVE
                                    </div>
                                )}
                                
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-inner ${pkg.isPremium ? 'bg-white/10' : pkg.bg}`}>
                                    <span className={`material-symbols-rounded text-3xl ${pkg.isPremium ? 'text-white' : pkg.text}`}>{pkg.icon}</span>
                                </div>

                                <h3 className={`text-lg font-black uppercase tracking-widest mb-1 ${pkg.isPremium ? 'text-white' : 'text-slate-800'}`}>{pkg.name}</h3>
                                <div className="flex items-baseline gap-1 mb-8">
                                    <span className={`text-2xl font-black ${pkg.isPremium ? 'text-white' : 'text-slate-900'}`}>{pkg.price}</span>
                                    <span className={`text-[10px] font-bold uppercase opacity-50 ${pkg.isPremium ? 'text-slate-400' : 'text-slate-500'}`}>{pkg.period}</span>
                                </div>

                                <ul className="space-y-4 mb-10 flex-1">
                                    {pkg.features.map((feat, idx) => (
                                        <li key={idx} className="flex items-start gap-3 text-xs font-semibold leading-relaxed">
                                            <span className={`material-symbols-rounded text-sm shrink-0 mt-0.5 ${pkg.isPremium ? 'text-emerald-400' : 'text-emerald-500'}`}>check_circle</span>
                                            <span className={pkg.isPremium ? 'text-slate-300' : 'text-slate-600'}>{feat}</span>
                                        </li>
                                    ))}
                                </ul>

                                <button 
                                    onClick={handleWhatsApp}
                                    className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all active:scale-95 shadow-lg ${
                                        pkg.isPremium 
                                        ? 'bg-gradient-to-r from-emerald-500 to-emerald-400 text-white shadow-emerald-500/20 hover:shadow-emerald-500/40' 
                                        : 'bg-slate-900 text-white hover:bg-emerald-600'
                                    }`}
                                >
                                    Pilih Paket
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer Contact */}
                <div className="p-8 bg-slate-50 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-white shadow-md flex items-center justify-center">
                            <span className="material-symbols-rounded text-emerald-500">support_agent</span>
                        </div>
                        <div>
                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Butuh Bantuan / Custom Paket?</p>
                            <p className="text-slate-800 font-bold text-sm">Hubungi Konsultan Kami: <span className="text-emerald-600 font-black">0812-1491-4641</span></p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <button onClick={handleWhatsApp} className="flex items-center gap-2 px-8 py-3.5 bg-[#25D366] text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-green-200">
                            <span className="material-symbols-rounded">chat</span>
                            WhatsApp Admin
                        </button>
                        <button onClick={onClose} className="px-8 py-3.5 bg-white text-slate-400 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:text-slate-800 transition-all border border-slate-200">
                            Tutup
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SubscriptionModal;
