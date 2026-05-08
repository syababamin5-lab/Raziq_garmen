import React, { useState, useEffect } from 'react';

const InstallPage = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setDeferredPrompt(null);
    } else {
      alert('Mohon tunggu sebentar atau refresh halaman ini. Jika tetap tidak muncul, klik titik tiga di pojok kanan atas Chrome lalu pilih "Instal Aplikasi".');
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans flex flex-col items-center justify-center p-6 text-center">
      <div className="w-32 h-32 bg-emerald-500/20 rounded-[2.5rem] border border-emerald-500/30 flex items-center justify-center mb-8 shadow-2xl shadow-emerald-500/20">
        <img src="/raziq_cutting_app_icon.png" alt="Logo" className="w-24 h-24 object-contain" />
      </div>
      
      <h1 className="text-3xl font-black tracking-tight uppercase mb-2">Instal Raziq Cutting</h1>
      <p className="text-slate-400 text-sm mb-12 max-w-xs uppercase font-bold tracking-widest leading-relaxed">
        Klik tombol di bawah untuk memasang aplikasi di HP Anda tanpa lewat Chrome lagi.
      </p>

      <button 
        onClick={handleInstall}
        className="w-full max-w-xs bg-emerald-600 hover:bg-emerald-500 text-white font-black py-6 rounded-3xl shadow-xl shadow-emerald-600/30 transition-all active:scale-95 flex items-center justify-center gap-3 animate-bounce"
      >
        <span className="material-symbols-rounded text-2xl">download_for_offline</span>
        PASANG APLIKASI SEKARANG
      </button>

      <div className="mt-16 space-y-4">
        <p className="text-[10px] text-slate-500 uppercase font-black tracking-[0.2em]">Cara Alternatif:</p>
        <div className="flex flex-col items-start gap-3 text-[10px] text-slate-400 font-bold uppercase tracking-widest bg-white/5 p-6 rounded-3xl border border-white/5">
          <p>1. Klik titik tiga di pojok kanan atas Chrome</p>
          <p>2. Pilih menu "Instal Aplikasi"</p>
        </div>
      </div>
    </div>
  );
};

export default InstallPage;
