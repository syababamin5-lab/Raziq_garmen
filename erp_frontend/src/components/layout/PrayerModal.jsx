import React from 'react';

const PrayerModal = ({ isOpen, onClose, prayerName }) => {
  if (!isOpen) return null;

  const quotesMapping = {
    "Subuh": {
      title: "Cahaya Fajar",
      quote: "Dua rakaat sebelum fajar lebih baik dari dunia dan seisinya.",
      sub: "Awali harimu dengan ketaatan di waktu Subuh."
    },
    "Dzuhur": {
      title: "Jeda Keberkahan",
      quote: "Dunia bisa menunggu, namun Allah memanggilmu sekarang.",
      sub: "Shalat Dzuhur adalah penyegar jiwa di tengah rutinitas."
    },
    "Ashar": {
      title: "Puncak Ketaatan",
      quote: "Jagalah shalat Asharmu, maka Allah akan menjaga urusan soremu.",
      sub: "Kesuksesan sejati adalah saat ibadah tetap terjaga."
    },
    "Maghrib": {
      title: "Senja Bersyukur",
      quote: "Syukuri nikmat hari ini dengan sujud yang khusyuk di waktu Maghrib.",
      sub: "Mari tutup hari dengan ketaatan kepada Sang Pencipta."
    },
    "Isya": {
      title: "Ketenangan Malam",
      quote: "Tutuplah hari ini dengan doa. Isya adalah gerbang ketenangan tidurmu.",
      sub: "Serahkan segala lelahmu kepada Sang Pemilik Kehidupan."
    },
    "Default": {
      title: "Panggilan Cinta",
      quote: "Shalatlah tepat waktu agar hidupmu selalu dalam bimbingan-Nya.",
      sub: "RAZIQ GARMEN | Spiritual & Professional Balance"
    }
  };

  const currentContent = quotesMapping[prayerName] || quotesMapping["Default"];

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/80 backdrop-blur-2xl p-6 transition-all duration-500">
      
      {/* Modal Box */}
      <div className="relative bg-white rounded-[3rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)] w-full max-w-lg animate-in zoom-in duration-300 border border-white/20">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-600 transition-all z-50"
        >
          <span className="material-symbols-rounded">close</span>
        </button>

        {/* Content Section */}
        <div className="p-12 text-center flex flex-col items-center gap-8">
          <div className="w-20 h-20 bg-emerald-50 rounded-3xl flex items-center justify-center text-emerald-600 shadow-inner">
            <span className="material-symbols-rounded text-4xl">mosque</span>
          </div>

          <div className="space-y-2">
            <div className="px-3 py-1 rounded-full bg-emerald-500 text-[10px] font-black uppercase tracking-widest text-white inline-block mb-2">
              WAKTU {prayerName.toUpperCase()} TIBA
            </div>
            <h2 className="text-4xl font-black text-slate-800 tracking-tighter uppercase leading-none">
              {currentContent.title}
            </h2>
          </div>

          <div className="space-y-4">
            <h3 className="text-2xl font-black text-slate-700 leading-tight">
              "{currentContent.quote}"
            </h3>
            <p className="text-slate-400 font-bold text-xs tracking-widest uppercase italic">
              {currentContent.sub}
            </p>
          </div>
          
          <div className="w-full pt-4">
            <button 
              onClick={onClose}
              className="w-full group relative bg-emerald-600 hover:bg-emerald-500 text-white font-black py-5 px-10 rounded-2xl shadow-xl shadow-emerald-600/30 transition-all active:scale-95 overflow-hidden"
            >
              <div className="relative z-10 flex items-center justify-center gap-3 text-lg uppercase tracking-tight">
                <span className="material-symbols-rounded">done_all</span>
                SAYA SIAP BERIBADAH
              </div>
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
            </button>
            
            <p className="mt-8 text-[9px] text-slate-300 font-black uppercase tracking-[0.5em]">
              RAZIQ GARMEN SYSTEM
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrayerModal;




