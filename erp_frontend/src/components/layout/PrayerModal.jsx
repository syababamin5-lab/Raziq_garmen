import React from 'react';

const PrayerModal = ({ isOpen, onClose, prayerName }) => {
  if (!isOpen) return null;

  const quotesMapping = {
    "Subuh": {
      title: "Awali Hari dengan Sujud",
      quote: "Awali harimu dengan sujud kepada-Nya, niscaya keberkahan akan menyertaimu sepanjang hari.",
      sub: "Rezeki yang berkah dimulai dari ketaatan di waktu fajar."
    },
    "Dzuhur": {
      title: "Istirahat Terbaik",
      quote: "Di tengah penatnya pekerjaan, ingatlah bahwa shalat adalah istirahat terbaik bagi jiwa.",
      sub: "Segarkan kembali semangatmu dengan menghadap Sang Pencipta."
    },
    "Ashar": {
      title: "Prioritas Utama",
      quote: "Jangan biarkan kesibukan sore hari melalaikanmu dari kewajiban utama.",
      sub: "Kesuksesan sejati adalah saat pekerjaan tidak menghalangi ibadah."
    },
    "Maghrib": {
      title: "Syukuri Hari Ini",
      quote: "Syukuri nikmat hari ini dengan shalat tepat waktu. Mari tutup hari dengan ketaatan.",
      sub: "Kemenangan hari ini adalah saat kita tetap teguh dalam barisan-Nya."
    },
    "Isya": {
      title: "Ketenangan Jiwa",
      quote: "Istirahatkan ragamu, namun jangan lupakan penciptamu. Shalat Isya adalah ketenangan.",
      sub: "Mari akhiri hari dengan syukur dan doa agar esok menjadi lebih baik."
    },
    "Default": {
      title: "Panggilan Kebaikan",
      quote: "Shalatlah tepat waktu, niscaya Allah akan memudahkan urusanmu.",
      sub: "Dunia sementara, akhirat selamanya. Mari luruskan niat, rapatkan barisan."
    }
  };

  const currentContent = quotesMapping[prayerName] || quotesMapping["Default"];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 md:p-12">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-emerald-950/90 backdrop-blur-xl"
        onClick={onClose}
      ></div>
      
      {/* Modal Content - Increased size by ~10% (max-w-xl) */}
      <div className="relative bg-white rounded-[4rem] overflow-hidden shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] w-full max-w-xl animate-in zoom-in slide-in-from-bottom-10 duration-500 ease-out">
        {/* Header Image */}
        <div className="relative h-72 overflow-hidden">
          <img 
            src="/prayer_bg.png" 
            alt="Prayer Time" 
            className="w-full h-full object-cover scale-110 hover:scale-100 transition-transform duration-1000"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent flex flex-col justify-end p-10 text-white">
            <h2 className="text-5xl font-black tracking-tighter leading-none mb-2">{currentContent.title}</h2>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full bg-emerald-500 text-[10px] font-black uppercase tracking-widest shadow-lg">ADZAN {prayerName.toUpperCase()}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-white/50"></span>
              <span className="text-white/70 font-bold text-xs uppercase tracking-widest">Waktunya Menghadap-Nya</span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="absolute top-8 right-8 w-12 h-12 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-emerald-600 transition-all hover:scale-110 active:scale-95 z-20"
          >
            <span className="material-symbols-rounded text-2xl">close</span>
          </button>
        </div>
        
        {/* Motivational Text */}
        <div className="p-12 text-center space-y-8">
          <div className="space-y-4">
            <h3 className="text-2xl md:text-3xl font-black text-slate-800 leading-[1.2] px-4">
              "{currentContent.quote}"
            </h3>
            <div className="w-16 h-1.5 bg-emerald-500 mx-auto rounded-full opacity-30"></div>
            <p className="text-slate-500 font-bold text-base max-w-sm mx-auto leading-relaxed italic">
              {currentContent.sub}
            </p>
          </div>
          
          <div className="flex flex-col gap-4 pt-4">
            <button 
              onClick={onClose}
              className="group relative bg-emerald-600 hover:bg-emerald-500 text-white font-black py-5 px-8 rounded-3xl shadow-2xl shadow-emerald-600/30 transition-all active:scale-95 overflow-hidden"
            >
              <div className="relative z-10 flex items-center justify-center gap-3 text-lg">
                <span className="material-symbols-rounded">check_circle</span>
                SAYA SIAP SHALAT SEKARANG
              </div>
              <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
            </button>
            
            <div className="flex flex-col items-center gap-1 opacity-40">
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em]">
                RAZIQ GARMEN | ENTERPRISE
              </p>
              <p className="text-[8px] text-slate-300 font-medium">Spiritual & Professional Balance</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrayerModal;

