import React from 'react';

const PrayerModal = ({ isOpen, onClose, prayerName }) => {
  if (!isOpen) return null;

  const quotesMapping = {
    "Subuh": {
      title: "Cahaya Fajar",
      quote: "Bangunlah untuk menyambut kemenangan. Dua rakaat sebelum fajar lebih baik dari dunia dan seisinya.",
      sub: "Awali harimu dengan keberkahan shalat Subuh berjamaah."
    },
    "Dzuhur": {
      title: "Jeda Keberkahan",
      quote: "Dunia bisa menunggu, namun Allah memanggilmu sekarang. Rehatlah sejenak dalam sujud.",
      sub: "Shalat Dzuhur adalah penyegar jiwa di tengah teriknya rutinitas."
    },
    "Ashar": {
      title: "Puncak Ketaatan",
      quote: "Jangan biarkan kesibukan sore menghapus pahalamu. Shalatlah sebelum waktu berlalu.",
      sub: "Jagalah shalat Ashar-mu, maka Allah akan menjaga urusan soremu."
    },
    "Maghrib": {
      title: "Senja Penuh Syukur",
      quote: "Matahari boleh terbenam, tapi imanmu harus tetap bersinar. Mari jemput ridha-Nya di waktu Maghrib.",
      sub: "Syukuri nikmat hari ini dengan sujud yang khusyuk."
    },
    "Isya": {
      title: "Ketenangan Malam",
      quote: "Tutuplah hari ini dengan doa dan sujud yang indah. Isya adalah gerbang ketenangan tidurmu.",
      sub: "Serahkan segala lelahmu kepada Sang Pemilik Kehidupan."
    },
    "Default": {
      title: "Panggilan Cinta",
      quote: "Shalatlah tepat waktu agar hidupmu selalu dalam bimbingan-Nya.",
      sub: "Dunia hanya sementara, persiapkan bekal terbaikmu sekarang."
    }
  };

  const currentContent = quotesMapping[prayerName] || quotesMapping["Default"];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Overlay dengan Blur Super Kuat */}
      <div 
        className="absolute inset-0 bg-emerald-950/60 backdrop-blur-3xl transition-all duration-700"
        onClick={onClose}
      ></div>
      
      {/* Modal Content - Perfectly Centered & Large */}
      <div className="relative bg-white/95 backdrop-blur-sm rounded-[4rem] overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] w-full max-w-xl animate-in zoom-in slide-in-from-bottom-20 duration-500 ease-out border border-white/20">
        
        {/* Header Image Section */}
        <div className="relative h-80 overflow-hidden">
          <img 
            src="/prayer_bg.png" 
            alt="Prayer Time" 
            className="w-full h-full object-cover scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-emerald-950 via-black/20 to-transparent flex flex-col justify-end p-12 text-center items-center">
            <div className="mb-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/20 backdrop-blur-md border border-emerald-400/30 text-emerald-300 text-[10px] font-black uppercase tracking-[0.3em]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Waktu {prayerName} Tiba
            </div>
            <h2 className="text-5xl font-black text-white tracking-tighter leading-tight drop-shadow-2xl">
              {currentContent.title}
            </h2>
          </div>
          
          <button 
            onClick={onClose}
            className="absolute top-8 right-8 w-12 h-12 rounded-full bg-black/20 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white hover:bg-red-500 transition-all hover:scale-110 active:scale-95 z-30"
          >
            <span className="material-symbols-rounded text-2xl">close</span>
          </button>
        </div>
        
        {/* Content Section - High Centering */}
        <div className="p-14 text-center flex flex-col items-center">
          <div className="max-w-md space-y-6">
            <span className="material-symbols-rounded text-emerald-600 text-5xl opacity-20">format_quote</span>
            <h3 className="text-3xl font-black text-slate-800 leading-tight -mt-4">
              "{currentContent.quote}"
            </h3>
            <p className="text-slate-500 font-bold text-lg italic opacity-80">
              {currentContent.sub}
            </p>
            <div className="w-20 h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent mx-auto rounded-full mt-6 opacity-40"></div>
          </div>
          
          <div className="w-full mt-12 flex flex-col items-center gap-6">
            <button 
              onClick={onClose}
              className="w-full max-w-sm group relative bg-emerald-600 hover:bg-emerald-500 text-white font-black py-5 px-10 rounded-[2rem] shadow-2xl shadow-emerald-600/40 transition-all active:scale-95 overflow-hidden"
            >
              <div className="relative z-10 flex items-center justify-center gap-4 text-xl tracking-tight">
                <span className="material-symbols-rounded">mosque</span>
                SAYA SIAP BERIBADAH
              </div>
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out"></div>
            </button>
            
            <div className="flex flex-col items-center gap-2">
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.4em] opacity-60">
                RAZIQ GARMEN SYSTEM
              </p>
              <div className="flex items-center gap-2 text-[8px] font-bold text-slate-300 uppercase tracking-widest">
                <span>Spiritual</span>
                <span className="w-1 h-1 rounded-full bg-slate-200"></span>
                <span>Professional</span>
                <span className="w-1 h-1 rounded-full bg-slate-200"></span>
                <span>Integrity</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrayerModal;


