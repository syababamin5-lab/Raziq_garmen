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
    <div className="fixed inset-0 z-[9999]">
      {/* Overlay dengan Blur Ekstrim (Inline Style untuk kepastian) */}
      <div 
        className="absolute inset-0 bg-slate-900/40"
        style={{ backdropFilter: 'blur(60px)', WebkitBackdropFilter: 'blur(60px)' }}
        onClick={onClose}
      ></div>
      
      {/* Modal Container - Centered using translate */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-xl p-4">
        <div className="bg-white rounded-[4rem] overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.6)] w-full animate-in zoom-in duration-500">
          
          {/* Header Image */}
          <div className="relative h-64 overflow-hidden">
            <img 
              src="/prayer_bg.png" 
              alt="Prayer Time" 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent flex flex-col justify-end p-10 text-center items-center">
              <div className="mb-2 px-3 py-1 rounded-full bg-emerald-500 text-[9px] font-black uppercase tracking-widest text-white shadow-lg">
                ADZAN {prayerName.toUpperCase()}
              </div>
              <h2 className="text-4xl font-black text-white tracking-tighter drop-shadow-xl uppercase">
                {currentContent.title}
              </h2>
            </div>
            
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-red-500 transition-all z-30"
            >
              <span className="material-symbols-rounded">close</span>
            </button>
          </div>
          
          {/* Content Section */}
          <div className="p-12 text-center flex flex-col items-center gap-6">
            <div className="space-y-4">
              <h3 className="text-2xl md:text-3xl font-black text-slate-800 leading-tight">
                "{currentContent.quote}"
              </h3>
              <p className="text-slate-400 font-bold text-sm tracking-wide uppercase italic">
                {currentContent.sub}
              </p>
            </div>
            
            <div className="w-full mt-4 flex flex-col items-center gap-4">
              <button 
                onClick={onClose}
                className="w-full group relative bg-emerald-600 hover:bg-emerald-500 text-white font-black py-5 px-10 rounded-3xl shadow-xl shadow-emerald-600/30 transition-all active:scale-95"
              >
                <div className="flex items-center justify-center gap-3 text-lg uppercase tracking-tighter">
                  <span className="material-symbols-rounded">mosque</span>
                  SAYA SIAP BERIBADAH
                </div>
              </button>
              
              <div className="flex flex-col items-center opacity-30">
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.4em]">
                  RAZIQ GARMEN SYSTEM
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrayerModal;



